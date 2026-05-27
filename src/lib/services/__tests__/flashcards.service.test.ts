import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import { importFlashcards } from "../flashcards.service";

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
}

/**
 * Builds a chainable Supabase-client stub mirroring exactly the call shapes
 * `importFlashcards` uses. There is no precedent for a query-builder mock in
 * this repo (the existing service test exercises a pure function), so this is
 * built from scratch.
 *
 * Three terminal shapes are supported:
 *  - lookup:  `.from().select().eq().eq().limit().maybeSingle()` → `{ data, error }`
 *  - insert:  `.from().insert(rows)` then awaited                → `{ error }`
 *  - update:  `.from().update(p).eq().eq()` then awaited         → `{ error }`
 *
 * Each `.from()` returns a fresh builder so parallel lookups don't share state.
 * The builder is thenable so the insert/update chains resolve when awaited,
 * while lookups resolve via the explicit `.maybeSingle()` call.
 */
function createMockSupabase(opts: MockOptions = {}) {
  const existingByFront = opts.existingByFront ?? {};
  const captured = {
    fromTables: [] as string[],
    lookups: [] as EqCall[][], // eq filters per lookup
    inserts: [] as Record<string, unknown>[][], // rows per insert() call
    updates: [] as { payload: Record<string, unknown>; eqCalls: EqCall[] }[],
  };

  function makeBuilder() {
    const eqCalls: EqCall[] = [];
    let op: "select" | "insert" | "update" | null = null;
    let updatePayload: Record<string, unknown> = {};

    const builder = {
      select() {
        op = "select";
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
      eq(col: string, val: unknown) {
        eqCalls.push({ col, val });
        return builder;
      },
      limit() {
        return builder;
      },
      maybeSingle() {
        captured.lookups.push([...eqCalls]);
        if (opts.lookupError) {
          return Promise.resolve({ data: null, error: opts.lookupError });
        }
        const front = eqCalls.find((c) => c.col === "front")?.val as string;
        const existing = existingByFront[front] ?? null;
        return Promise.resolve({ data: existing, error: null });
      },
      // Thenable: only awaited for the insert/update terminal operations.
      then(
        onFulfilled: (value: { error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        let result: { error: unknown };
        if (op === "insert") {
          result = { error: opts.insertError ?? null };
        } else if (op === "update") {
          captured.updates.push({ payload: updatePayload, eqCalls: [...eqCalls] });
          result = { error: opts.updateError ?? null };
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
    for (const eqCalls of captured.lookups) {
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
    expect(captured.lookups[0]).toEqual(
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
