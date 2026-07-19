import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import {
  importFlashcards,
  deleteManualFlashcards,
  listManualFlashcards,
  patchManualFlashcards,
  processImportRequest,
} from "../flashcards.service";

/**
 * Records one recorded `.eq(col, val)` filter on a query chain.
 */
interface EqCall {
  col: string;
  val: unknown;
}

interface MockOptions {
  /**
   * Maps a card `front` to the row the existence lookup should return, or
   * `null` for "no existing row". Unlisted fronts default to `null` (insert).
   */
  existingByFront?: Record<string, { id: number } | null>;
  /** Force the lookup `.maybeSingle()` to return an error. */
  lookupError?: { message: string } | null;
  /** Force the batch `.insert()` to return an error. */
  insertError?: { message: string } | null;
  /** Force an `.update()` to return an error. */
  updateError?: { message: string } | null;
  /**
   * Maps a `front` to the rows a `.delete().select("id")` chain returns for it
   * (the real API returns the deleted rows). Unlisted fronts delete nothing.
   */
  deleteRowsByFront?: Record<string, { id: number }[]>;
  /** Force a `.delete()` chain to return an error. */
  deleteError?: { message: string } | null;
  /** Rows an awaited list `.select()` chain returns (GET read path). */
  listRows?: { front: string; back: string }[];
  /** Exact match count the list chain reports (defaults to listRows.length). */
  listCount?: number;
  /** Force the list chain to return an error. */
  listError?: { message: string } | null;
}

/**
 * Builds a chainable Supabase-client stub mirroring exactly the call shapes
 * `importFlashcards` uses. There is no precedent for a query-builder mock in
 * this repo (the existing service test exercises a pure function), so this is
 * built from scratch.
 *
 * Four terminal shapes are supported:
 *  - lookup:  `.from().select().eq()…[.neq()].limit().maybeSingle()` → `{ data, error }`
 *  - insert:  `.from().insert(rows)` then awaited                    → `{ error }`
 *  - update:  `.from().update(p).eq()…` then awaited                 → `{ error }`
 *  - delete:  `.from().delete().eq()×3.select("id")` then awaited    → `{ data, error }`
 *    (the trailing `.select()` must not overwrite the delete op — it only asks
 *    PostgREST to return the deleted rows)
 *
 * Each `.from()` returns a fresh builder so parallel lookups don't share state.
 * The builder is thenable so the insert/update/delete chains resolve when
 * awaited, while lookups resolve via the explicit `.maybeSingle()` call.
 *
 * IMPORTANT: filters are RECORDED for assertion, not applied — `maybeSingle()`
 * resolves purely from the `front` eq value, ignoring `source`/`.neq()`. Assert
 * safety scoping via the captured eq/neq calls; behavioral filtering is
 * route.integration.test.ts's job.
 * `opOrder` records each terminal in execution order, so orchestrator tests can
 * assert the delete → patch → upsert phase sequence.
 */
function createMockSupabase(opts: MockOptions = {}) {
  const existingByFront = opts.existingByFront ?? {};
  const deleteRowsByFront = opts.deleteRowsByFront ?? {};
  const captured = {
    fromTables: [] as string[],
    lookups: [] as { eqCalls: EqCall[]; neqCalls: EqCall[] }[],
    inserts: [] as Record<string, unknown>[][], // rows per insert() call
    updates: [] as { payload: Record<string, unknown>; eqCalls: EqCall[] }[],
    deletes: [] as { eqCalls: EqCall[] }[],
    // Awaited list selects (GET read path): recorded args for assertion.
    lists: [] as {
      selectArgs: { columns?: string; options?: Record<string, unknown> };
      eqCalls: EqCall[];
      limitN: number | null;
    }[],
    opOrder: [] as string[], // terminal ops in execution order
  };

  function makeBuilder() {
    const eqCalls: EqCall[] = [];
    const neqCalls: EqCall[] = [];
    let op: "select" | "insert" | "update" | "delete" | null = null;
    let updatePayload: Record<string, unknown> = {};
    let selectArgs: { columns?: string; options?: Record<string, unknown> } = {};
    let limitN: number | null = null;

    const builder = {
      select(columns?: string, options?: Record<string, unknown>) {
        // After .delete(), .select("id") only requests the deleted rows back —
        // it must not turn the chain into a lookup.
        if (op === null) {
          op = "select";
          selectArgs = { columns, options };
        }
        return builder;
      },
      insert(rows: Record<string, unknown>[]) {
        op = "insert";
        captured.inserts.push(rows);
        return builder; // awaited by caller → resolves via then()
      },
      update(payload: Record<string, unknown>) {
        op = "update";
        updatePayload = payload;
        return builder;
      },
      delete() {
        op = "delete";
        return builder;
      },
      eq(col: string, val: unknown) {
        eqCalls.push({ col, val });
        return builder;
      },
      neq(col: string, val: unknown) {
        neqCalls.push({ col, val });
        return builder;
      },
      limit(n: number) {
        limitN = n;
        return builder;
      },
      maybeSingle() {
        captured.lookups.push({ eqCalls: [...eqCalls], neqCalls: [...neqCalls] });
        captured.opOrder.push("lookup");
        if (opts.lookupError) {
          return Promise.resolve({ data: null, error: opts.lookupError });
        }
        const front = eqCalls.find((c) => c.col === "front")?.val as string;
        const existing = existingByFront[front] ?? null;
        return Promise.resolve({ data: existing, error: null });
      },
      // Thenable: only awaited for the insert/update/delete terminal operations.
      then(
        onFulfilled: (value: {
          data?: unknown;
          count?: unknown;
          error: unknown;
        }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        let result: { data?: unknown; count?: unknown; error: unknown };
        if (op === "insert") {
          captured.opOrder.push("insert");
          result = { error: opts.insertError ?? null };
        } else if (op === "update") {
          captured.updates.push({ payload: updatePayload, eqCalls: [...eqCalls] });
          captured.opOrder.push("update");
          result = { error: opts.updateError ?? null };
        } else if (op === "delete") {
          captured.deletes.push({ eqCalls: [...eqCalls] });
          captured.opOrder.push("delete");
          const front = eqCalls.find((c) => c.col === "front")?.val as string;
          result = opts.deleteError
            ? { data: null, error: opts.deleteError }
            : { data: deleteRowsByFront[front] ?? [], error: null };
        } else if (op === "select") {
          // Awaited list chain (GET read path); lookups instead resolve via
          // the explicit .maybeSingle() and never reach here.
          captured.lists.push({ selectArgs, eqCalls: [...eqCalls], limitN });
          captured.opOrder.push("list");
          const listRows = opts.listRows ?? [];
          result = opts.listError
            ? { data: null, count: null, error: opts.listError }
            : {
                data: listRows,
                count: opts.listCount ?? listRows.length,
                error: null,
              };
        } else {
          result = { error: null };
        }
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  const client = {
    from(table: string) {
      captured.fromTables.push(table);
      return makeBuilder();
    },
  };

  return {
    // Cast through unknown: the stub implements only the surface importFlashcards uses.
    client: client as unknown as SupabaseClient<Database>,
    captured,
  };
}

const USER_ID = "import-user-uuid-123";

describe("importFlashcards", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("partitions a new front (insert) from an existing front (update); insert carries source/defaults, update sets only back", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: {
        "Existing front": { id: 42 },
        "New front": null,
      },
    });

    const result = await importFlashcards(
      [
        { front: "New front", back: "New back" },
        { front: "Existing front", back: "Updated back" },
      ],
      USER_ID,
      client,
    );

    expect(result).toEqual({ inserted: 1, updated: 1 });

    // One batch insert containing exactly the new card with the right defaults.
    expect(captured.inserts).toHaveLength(1);
    expect(captured.inserts[0]).toHaveLength(1);
    const insertedRow = captured.inserts[0][0];
    expect(insertedRow).toMatchObject({
      user_id: USER_ID,
      front: "New front",
      back: "New back",
      source: "manual",
      generation_id: null,
      stability: null,
      difficulty: null,
      lapses: 0,
      state: 0,
      last_review: null,
    });
    expect(typeof insertedRow.due).toBe("string"); // FSRS "due now" default

    // One update setting ONLY back, scoped to the existing row's id.
    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].payload).toEqual({ back: "Updated back" });
    expect(Object.keys(captured.updates[0].payload)).toEqual(["back"]);
    expect(captured.updates[0].eqCalls).toEqual(
      expect.arrayContaining([{ col: "id", val: 42 }]),
    );
  });

  it("collapses intra-batch duplicate fronts last-wins to a single write and warns", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: { Duplicate: null },
    });

    const result = await importFlashcards(
      [
        { front: "Duplicate", back: "first value" },
        { front: "Duplicate", back: "second value" },
      ],
      USER_ID,
      client,
    );

    expect(result).toEqual({ inserted: 1, updated: 0 });
    // Only one lookup and one inserted row despite two input cards.
    expect(captured.lookups).toHaveLength(1);
    expect(captured.inserts[0]).toHaveLength(1);
    // Last occurrence wins.
    expect(captured.inserts[0][0].back).toBe("second value");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("collapsed 1");
  });

  it("scopes every lookup, insert, and update to the passed userId", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: {
        "Existing front": { id: 7 },
        "New front": null,
      },
    });

    await importFlashcards(
      [
        { front: "New front", back: "nb" },
        { front: "Existing front", back: "ub" },
      ],
      USER_ID,
      client,
    );

    // Every lookup filtered on user_id.
    for (const { eqCalls } of captured.lookups) {
      expect(eqCalls).toEqual(
        expect.arrayContaining([{ col: "user_id", val: USER_ID }]),
      );
    }
    // Every inserted row carries the user_id.
    for (const rows of captured.inserts) {
      for (const row of rows) {
        expect(row.user_id).toBe(USER_ID);
      }
    }
    // Every update filtered on user_id.
    for (const update of captured.updates) {
      expect(update.eqCalls).toEqual(
        expect.arrayContaining([{ col: "user_id", val: USER_ID }]),
      );
    }
  });

  it("quote-safe matching: a front containing a double-quote whose row exists is classified as update, not insert", async () => {
    const frontWithQuote = 'Question with "quotes"';
    const { client, captured } = createMockSupabase({
      existingByFront: { [frontWithQuote]: { id: 99 } },
    });

    const result = await importFlashcards(
      [{ front: frontWithQuote, back: "answer" }],
      USER_ID,
      client,
    );

    // Matched its existing row → update, no duplicate insert.
    expect(result).toEqual({ inserted: 0, updated: 1 });
    expect(captured.inserts).toHaveLength(0);
    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].eqCalls).toEqual(
      expect.arrayContaining([{ col: "id", val: 99 }]),
    );
    // The lookup used the exact quoted front via .eq (not a mangled .in value).
    expect(captured.lookups[0].eqCalls).toEqual(
      expect.arrayContaining([{ col: "front", val: frontWithQuote }]),
    );
  });

  it("rethrows when the existence lookup errors", async () => {
    const { client } = createMockSupabase({
      existingByFront: { f: null },
      lookupError: { message: "lookup boom" },
    });

    await expect(
      importFlashcards([{ front: "f", back: "b" }], USER_ID, client),
    ).rejects.toEqual({ message: "lookup boom" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("rethrows when the batch insert errors", async () => {
    const { client } = createMockSupabase({
      existingByFront: { f: null },
      insertError: { message: "insert boom" },
    });

    await expect(
      importFlashcards([{ front: "f", back: "b" }], USER_ID, client),
    ).rejects.toEqual({ message: "insert boom" });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("deleteManualFlashcards", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("deletes per-front and sums returned rows for the exact count (duplicate-front rows all removed)", async () => {
    const { client, captured } = createMockSupabase({
      // "Twice" exists as two manual rows (no unique constraint on front);
      // delete removes both, and the count reflects it.
      deleteRowsByFront: { Twice: [{ id: 1 }, { id: 2 }], Once: [{ id: 3 }] },
    });

    const result = await deleteManualFlashcards(["Twice", "Once"], USER_ID, client);

    expect(result).toEqual({ deleted: 3 });
    // One delete chain per front — per-front .eq(), never a single .in() list.
    expect(captured.deletes).toHaveLength(2);
    const frontsDeleted = captured.deletes.map(
      (d) => d.eqCalls.find((c) => c.col === "front")?.val,
    );
    expect(frontsDeleted).toEqual(expect.arrayContaining(["Twice", "Once"]));
  });

  it("safety invariant: every delete carries .eq(user_id) AND .eq(source, manual) — AI cards are unreachable", async () => {
    const { client, captured } = createMockSupabase({
      deleteRowsByFront: { a: [{ id: 1 }] },
    });

    await deleteManualFlashcards(["a", "b"], USER_ID, client);

    expect(captured.deletes).toHaveLength(2);
    for (const { eqCalls } of captured.deletes) {
      expect(eqCalls).toEqual(
        expect.arrayContaining([
          { col: "user_id", val: USER_ID },
          { col: "source", val: "manual" },
        ]),
      );
    }
  });

  it("deleting an absent front is a no-op contributing zero (idempotent retries)", async () => {
    const { client, captured } = createMockSupabase({});

    const result = await deleteManualFlashcards(["ghost"], USER_ID, client);

    expect(result).toEqual({ deleted: 0 });
    expect(captured.deletes).toHaveLength(1);
  });

  it("collapses intra-batch duplicate fronts to a single delete and warns", async () => {
    const { client, captured } = createMockSupabase({
      deleteRowsByFront: { dup: [{ id: 5 }] },
    });

    const result = await deleteManualFlashcards(["dup", "dup"], USER_ID, client);

    expect(result).toEqual({ deleted: 1 });
    expect(captured.deletes).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("collapsed 1");
  });

  it("rethrows when a delete errors", async () => {
    const { client } = createMockSupabase({
      deleteError: { message: "delete boom" },
    });

    await expect(
      deleteManualFlashcards(["f"], USER_ID, client),
    ).rejects.toEqual({ message: "delete boom" });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("patchManualFlashcards", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("happy rename: finds the manual row, checks the target front, updates front+back in place", async () => {
    const { client, captured } = createMockSupabase({
      // old_front resolves to the row; new_front resolves to nothing (free).
      existingByFront: { "Old Q": { id: 5 }, "New Q": null },
    });

    const result = await patchManualFlashcards(
      [{ old_front: "Old Q", new_front: "New Q", new_back: "New A" }],
      USER_ID,
      client,
    );

    expect(result).toEqual({ patched: 1, skipped_patches: [] });

    // Two lookups: the old_front lookup then the conflict check.
    expect(captured.lookups).toHaveLength(2);
    // Safety invariant on the row lookup: user_id AND source='manual'.
    expect(captured.lookups[0].eqCalls).toEqual(
      expect.arrayContaining([
        { col: "user_id", val: USER_ID },
        { col: "source", val: "manual" },
        { col: "front", val: "Old Q" },
      ]),
    );
    // Conflict check is source-AGNOSTIC (any source blocks the rename) and
    // excludes the row's own id via .neq.
    const conflictLookup = captured.lookups[1];
    expect(conflictLookup.eqCalls).toEqual(
      expect.arrayContaining([
        { col: "user_id", val: USER_ID },
        { col: "front", val: "New Q" },
      ]),
    );
    expect(conflictLookup.eqCalls.map((c) => c.col)).not.toContain("source");
    expect(conflictLookup.neqCalls).toEqual([{ col: "id", val: 5 }]);

    // The update sets exactly front+back (updated_at is the DB trigger's job)
    // and is scoped to id AND user_id AND source='manual'.
    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].payload).toEqual({
      front: "New Q",
      back: "New A",
    });
    expect(captured.updates[0].eqCalls).toEqual(
      expect.arrayContaining([
        { col: "id", val: 5 },
        { col: "user_id", val: USER_ID },
        { col: "source", val: "manual" },
      ]),
    );
  });

  it("missing old_front → skipped with old_front_not_found, no update, patched excludes it", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: { ghost: null },
    });

    const result = await patchManualFlashcards(
      [{ old_front: "ghost", new_front: "renamed", new_back: "b" }],
      USER_ID,
      client,
    );

    expect(result).toEqual({
      patched: 0,
      skipped_patches: [{ old_front: "ghost", reason: "old_front_not_found" }],
    });
    // Only the row lookup ran — no conflict check, no update.
    expect(captured.lookups).toHaveLength(1);
    expect(captured.updates).toHaveLength(0);
  });

  it("rename conflict → skipped with new_front_conflict, no update", async () => {
    const { client, captured } = createMockSupabase({
      // The row to patch exists, but another row already owns the target front.
      existingByFront: { "Old Q": { id: 1 }, Taken: { id: 9 } },
    });

    const result = await patchManualFlashcards(
      [{ old_front: "Old Q", new_front: "Taken", new_back: "b" }],
      USER_ID,
      client,
    );

    expect(result).toEqual({
      patched: 0,
      skipped_patches: [{ old_front: "Old Q", reason: "new_front_conflict" }],
    });
    expect(captured.updates).toHaveLength(0);
  });

  it("back-only patch (old_front === new_front) skips the conflict check and never self-collides", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: { Same: { id: 3 } },
    });

    const result = await patchManualFlashcards(
      [{ old_front: "Same", new_front: "Same", new_back: "refreshed back" }],
      USER_ID,
      client,
    );

    expect(result).toEqual({ patched: 1, skipped_patches: [] });
    // Exactly ONE lookup: the row lookup. A conflict check here would find the
    // row itself and wrongly skip the patch.
    expect(captured.lookups).toHaveLength(1);
    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].payload).toEqual({
      front: "Same",
      back: "refreshed back",
    });
  });

  it("collapses intra-batch duplicate old_fronts last-wins and warns", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: { dup: { id: 7 }, "second target": null },
    });

    const result = await patchManualFlashcards(
      [
        { old_front: "dup", new_front: "first target", new_back: "b1" },
        { old_front: "dup", new_front: "second target", new_back: "b2" },
      ],
      USER_ID,
      client,
    );

    expect(result).toEqual({ patched: 1, skipped_patches: [] });
    // One patch executed, carrying the LAST occurrence's values.
    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].payload).toEqual({
      front: "second target",
      back: "b2",
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("collapsed 1");
  });

  it("one skipped patch does not block the rest of the batch", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: { ghost: null, "Old Q": { id: 4 }, "New Q": null },
    });

    const result = await patchManualFlashcards(
      [
        { old_front: "ghost", new_front: "x", new_back: "b" },
        { old_front: "Old Q", new_front: "New Q", new_back: "nb" },
      ],
      USER_ID,
      client,
    );

    expect(result).toEqual({
      patched: 1,
      skipped_patches: [{ old_front: "ghost", reason: "old_front_not_found" }],
    });
    expect(captured.updates).toHaveLength(1);
  });

  it("rethrows when the row lookup errors", async () => {
    const { client } = createMockSupabase({
      lookupError: { message: "patch lookup boom" },
    });

    await expect(
      patchManualFlashcards(
        [{ old_front: "f", new_front: "g", new_back: "b" }],
        USER_ID,
        client,
      ),
    ).rejects.toEqual({ message: "patch lookup boom" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("rethrows when the update errors", async () => {
    const { client } = createMockSupabase({
      existingByFront: { f: { id: 1 }, g: null },
      updateError: { message: "patch update boom" },
    });

    await expect(
      patchManualFlashcards(
        [{ old_front: "f", new_front: "g", new_back: "b" }],
        USER_ID,
        client,
      ),
    ).rejects.toEqual({ message: "patch update boom" });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("processImportRequest", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("combined request: runs delete → patch → upsert in order and assembles all five fields", async () => {
    const { client, captured } = createMockSupabase({
      deleteRowsByFront: { "Del me": [{ id: 1 }] },
      existingByFront: {
        "Old Q": { id: 2 }, // patch target row
        "New Q": null, // rename destination is free
        "Fresh card": null, // upsert classifies as insert
      },
    });

    const result = await processImportRequest(
      {
        cards: [{ front: "Fresh card", back: "fb" }],
        delete_fronts: ["Del me"],
        patches: [{ old_front: "Old Q", new_front: "New Q", new_back: "nb" }],
      },
      USER_ID,
      client,
    );

    expect(result).toEqual({
      inserted: 1,
      updated: 0,
      deleted: 1,
      patched: 1,
      skipped_patches: [],
    });

    // Smoke-script compat: literal key order pins "inserted","updated" first
    // and adjacent (NextResponse.json preserves it; the script greps the pair).
    expect(Object.keys(result)).toEqual([
      "inserted",
      "updated",
      "deleted",
      "patched",
      "skipped_patches",
    ]);

    // Deterministic phase order: delete → patch (lookup×2 + update) → upsert
    // (lookup + insert).
    expect(captured.opOrder).toEqual([
      "delete",
      "lookup",
      "lookup",
      "update",
      "lookup",
      "insert",
    ]);
  });

  it("cards-only request (legacy shape): zero counts for missing phases, no delete/patch queries", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: { Existing: { id: 1 } },
    });

    const result = await processImportRequest(
      { cards: [{ front: "Existing", back: "ub" }] },
      USER_ID,
      client,
    );

    expect(result).toEqual({
      inserted: 0,
      updated: 1,
      deleted: 0,
      patched: 0,
      skipped_patches: [],
    });
    expect(captured.deletes).toHaveLength(0);
  });

  it("delete-only request: no patch/upsert queries run", async () => {
    const { client, captured } = createMockSupabase({
      deleteRowsByFront: { gone: [{ id: 1 }] },
    });

    const result = await processImportRequest(
      { delete_fronts: ["gone"] },
      USER_ID,
      client,
    );

    expect(result).toEqual({
      inserted: 0,
      updated: 0,
      deleted: 1,
      patched: 0,
      skipped_patches: [],
    });
    expect(captured.lookups).toHaveLength(0);
    expect(captured.inserts).toHaveLength(0);
    expect(captured.updates).toHaveLength(0);
  });

  it("patches-only request: skipped_patches propagate to the response", async () => {
    const { client, captured } = createMockSupabase({
      existingByFront: { ghost: null },
    });

    const result = await processImportRequest(
      { patches: [{ old_front: "ghost", new_front: "x", new_back: "b" }] },
      USER_ID,
      client,
    );

    expect(result).toEqual({
      inserted: 0,
      updated: 0,
      deleted: 0,
      patched: 0,
      skipped_patches: [{ old_front: "ghost", reason: "old_front_not_found" }],
    });
    expect(captured.deletes).toHaveLength(0);
    expect(captured.inserts).toHaveLength(0);
  });
});

describe("listManualFlashcards", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("selects only front/back with an exact count, scoped to user_id AND source='manual', capped at 500", async () => {
    const rows = [
      { front: "Q1", back: "A1" },
      { front: "Q2", back: "A2" },
    ];
    const { client, captured } = createMockSupabase({ listRows: rows });

    const result = await listManualFlashcards(USER_ID, client);

    expect(captured.fromTables).toEqual(["flashcards"]);
    expect(captured.lists).toHaveLength(1);
    const list = captured.lists[0];
    // The projection is the whole contract: no ids, FSRS state, or timestamps.
    expect(list.selectArgs.columns).toBe("front, back");
    expect(list.selectArgs.options).toEqual({ count: "exact" });
    // Safety invariant: both scoping filters present.
    expect(list.eqCalls).toEqual([
      { col: "user_id", val: USER_ID },
      { col: "source", val: "manual" },
    ]);
    expect(list.limitN).toBe(500);

    expect(result).toEqual({ cards: rows, count: 2, truncated: false });
  });

  it("empty table → { cards: [], count: 0, truncated: false }, never an error", async () => {
    const { client } = createMockSupabase({ listRows: [] });

    const result = await listManualFlashcards(USER_ID, client);

    expect(result).toEqual({ cards: [], count: 0, truncated: false });
  });

  it("more than 500 matching rows → truncated: true, count reflects returned rows only", async () => {
    // The DB enforces the limit; the mock hands back exactly 500 rows while
    // the exact match count says 613 exist.
    const rows = Array.from({ length: 500 }, (_, i) => ({
      front: `Q${i}`,
      back: `A${i}`,
    }));
    const { client } = createMockSupabase({ listRows: rows, listCount: 613 });

    const result = await listManualFlashcards(USER_ID, client);

    expect(result.truncated).toBe(true);
    expect(result.count).toBe(500);
    expect(result.cards).toHaveLength(500);
  });

  it("exactly 500 matching rows → truncated: false (cap not exceeded)", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      front: `Q${i}`,
      back: `A${i}`,
    }));
    const { client } = createMockSupabase({ listRows: rows, listCount: 500 });

    const result = await listManualFlashcards(USER_ID, client);

    expect(result).toEqual({ cards: rows, count: 500, truncated: false });
  });

  it("DB error → logs and throws (the route translates to 500)", async () => {
    const { client } = createMockSupabase({
      listError: { message: "connection refused" },
    });

    await expect(listManualFlashcards(USER_ID, client)).rejects.toThrow(
      "connection refused",
    );
    expect(errorSpy).toHaveBeenCalled();
  });
});
