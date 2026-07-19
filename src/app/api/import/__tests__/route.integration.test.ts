import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration-shaped tests: the REAL route handler and the REAL
 * processImportRequest orchestrator (plus the real Zod schema), with only
 * `createAdminClient` mocked to a query builder over an in-memory rows array.
 *
 * This covers the seam neither sibling file reaches: route.test.ts mocks the
 * orchestrator wholesale (asserting only that it is called), and
 * flashcards.service.test.ts asserts per-phase query shapes. Neither proves
 * that the route hands the validated payload through and the phases compose
 * into the five-field body — or that the smoke script's key-order grep still
 * matches the real serialized response.
 */

const state = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => state.client,
}));

import { POST } from "../route";

interface Row {
  id: number;
  user_id: string;
  front: string;
  back: string;
  source: string;
  [key: string]: unknown;
}

type Filter = [string, unknown];

/**
 * Minimal in-memory stand-in for the PostgREST query builder, supporting
 * exactly the chains the import path uses: select / insert / update / delete /
 * eq / neq / limit / maybeSingle, plus a thenable terminal. `select()` after
 * `delete()` must NOT overwrite the pending op — it only asks for the deleted
 * rows back.
 */
function createInMemoryDb(seed: Omit<Row, "id">[]) {
  let nextId = 1;
  const rows: Row[] = seed.map((row) => ({ ...row, id: nextId++ }));

  function matches(row: Row, eqs: Filter[], neqs: Filter[]): boolean {
    return (
      eqs.every(([col, val]) => row[col] === val) &&
      neqs.every(([col, val]) => row[col] !== val)
    );
  }

  function makeBuilder() {
    const eqs: Filter[] = [];
    const neqs: Filter[] = [];
    let op: "select" | "insert" | "update" | "delete" | null = null;
    let payload: unknown = null;
    let limitN = Infinity;

    const builder = {
      select() {
        if (op === null) {
          op = "select";
        }
        return builder;
      },
      insert(newRows: Omit<Row, "id">[]) {
        op = "insert";
        payload = newRows;
        return builder;
      },
      update(patch: Partial<Row>) {
        op = "update";
        payload = patch;
        return builder;
      },
      delete() {
        op = "delete";
        return builder;
      },
      eq(col: string, val: unknown) {
        eqs.push([col, val]);
        return builder;
      },
      neq(col: string, val: unknown) {
        neqs.push([col, val]);
        return builder;
      },
      limit(n: number) {
        limitN = n;
        return builder;
      },
      maybeSingle() {
        const found = rows
          .filter((row) => matches(row, eqs, neqs))
          .slice(0, limitN);
        return Promise.resolve({
          data: found[0] ? { id: found[0].id } : null,
          error: null,
        });
      },
      then(
        onFulfilled: (value: { data?: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        let result: { data?: unknown; error: unknown };
        if (op === "insert") {
          for (const row of payload as Omit<Row, "id">[]) {
            rows.push({ ...row, id: nextId++ } as Row);
          }
          result = { error: null };
        } else if (op === "update") {
          for (const row of rows) {
            if (matches(row, eqs, neqs)) {
              Object.assign(row, payload);
            }
          }
          result = { error: null };
        } else if (op === "delete") {
          const removed = rows.filter((row) => matches(row, eqs, neqs));
          for (const row of removed) {
            rows.splice(rows.indexOf(row), 1);
          }
          result = { data: removed.map(({ id }) => ({ id })), error: null };
        } else {
          result = { data: null, error: null };
        }
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  return {
    client: { from: () => makeBuilder() },
    rows,
  };
}

const VALID_KEY = "test-secret-key-with-plenty-of-entropy";
const USER_ID = "import-user-uuid-123";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_KEY}`,
    },
    body: JSON.stringify(body),
  });
}

/** A manual card owned by the import user. */
function manualRow(front: string, back: string): Omit<Row, "id"> {
  return { user_id: USER_ID, front, back, source: "manual" };
}

describe("POST /api/import (integration: real route + real orchestrator)", () => {
  beforeEach(() => {
    process.env.IMPORT_API_KEY = VALID_KEY;
    process.env.IMPORT_USER_ID = USER_ID;
  });

  it("legacy cards-only insert → five-field body whose raw text still matches the smoke script's key-order grep", async () => {
    const db = createInMemoryDb([]);
    state.client = db.client;

    const res = await POST(
      makeRequest({ cards: [{ front: "Q1", back: "A1" }] }),
    );

    expect(res.status).toBe(200);
    const raw = await res.text();
    // The pre-Step-5 smoke script greps for this exact substring (grep -qF);
    // literal key order in processImportRequest's return keeps it matching.
    expect(raw).toContain('"inserted":1,"updated":0');
    expect(JSON.parse(raw)).toEqual({
      inserted: 1,
      updated: 0,
      deleted: 0,
      patched: 0,
      skipped_patches: [],
    });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({
      user_id: USER_ID,
      front: "Q1",
      back: "A1",
      source: "manual",
    });
  });

  it("delete-only request deletes all matching manual rows but never AI rows or other users' rows", async () => {
    const db = createInMemoryDb([
      manualRow("Shared front", "manual copy 1"),
      manualRow("Shared front", "manual copy 2"), // duplicate front: both go
      { user_id: USER_ID, front: "Shared front", back: "ai", source: "ai-full" },
      { user_id: "someone-else", front: "Shared front", back: "x", source: "manual" },
      manualRow("Keep me", "stays"),
    ]);
    state.client = db.client;

    const res = await POST(makeRequest({ delete_fronts: ["Shared front"] }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      inserted: 0,
      updated: 0,
      deleted: 2,
      patched: 0,
      skipped_patches: [],
    });
    // Survivors: the ai-full row, the other user's row, and the unrelated manual row.
    expect(db.rows).toHaveLength(3);
    expect(
      db.rows.find((r) => r.source === "ai-full" && r.front === "Shared front"),
    ).toBeDefined();
    expect(db.rows.find((r) => r.user_id === "someone-else")).toBeDefined();
  });

  it("patch-only request renames in place, preserving the row id", async () => {
    const db = createInMemoryDb([manualRow("Old front", "old back")]);
    state.client = db.client;
    const originalId = db.rows[0].id;

    const res = await POST(
      makeRequest({
        patches: [
          { old_front: "Old front", new_front: "New front", new_back: "new back" },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      inserted: 0,
      updated: 0,
      deleted: 0,
      patched: 1,
      skipped_patches: [],
    });
    expect(db.rows).toHaveLength(1);
    // Same row (id preserved → FSRS state preserved), new content.
    expect(db.rows[0]).toMatchObject({
      id: originalId,
      front: "New front",
      back: "new back",
      source: "manual",
    });
  });

  it("patch phase cannot touch an AI row even when old_front matches it", async () => {
    const db = createInMemoryDb([
      { user_id: USER_ID, front: "AI owned", back: "ai back", source: "ai-full" },
    ]);
    state.client = db.client;

    const res = await POST(
      makeRequest({
        patches: [{ old_front: "AI owned", new_front: "Hijack", new_back: "b" }],
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // The manual-scoped lookup misses the AI row → reported as not found.
    expect(body.patched).toBe(0);
    expect(body.skipped_patches).toEqual([
      { old_front: "AI owned", reason: "old_front_not_found" },
    ]);
    expect(db.rows[0]).toMatchObject({ front: "AI owned", back: "ai back" });
  });

  it("both skip reasons surface in one response; the good patch still lands", async () => {
    const db = createInMemoryDb([
      manualRow("Renaming", "b1"),
      manualRow("Taken", "b2"), // rename target already exists → conflict
      manualRow("Healthy", "b3"),
    ]);
    state.client = db.client;

    const res = await POST(
      makeRequest({
        patches: [
          { old_front: "Ghost", new_front: "Whatever", new_back: "b" },
          { old_front: "Renaming", new_front: "Taken", new_back: "b" },
          { old_front: "Healthy", new_front: "Healthy renamed", new_back: "b3+" },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      inserted: 0,
      updated: 0,
      deleted: 0,
      patched: 1,
      skipped_patches: [
        { old_front: "Ghost", reason: "old_front_not_found" },
        { old_front: "Renaming", reason: "new_front_conflict" },
      ],
    });
    expect(db.rows.find((r) => r.front === "Healthy renamed")).toBeDefined();
    // The skipped rename left its row untouched.
    expect(db.rows.find((r) => r.front === "Renaming")).toBeDefined();
  });

  it("phase order is delete → patch → upsert: a patch frees a front that the same request's upsert then re-creates", async () => {
    const db = createInMemoryDb([manualRow("B", "old B back")]);
    state.client = db.client;

    const res = await POST(
      makeRequest({
        patches: [{ old_front: "B", new_front: "C", new_back: "moved" }],
        cards: [{ front: "B", back: "fresh B" }],
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      inserted: 1,
      updated: 0,
      deleted: 0,
      patched: 1,
      skipped_patches: [],
    });
    // Patch ran first (B → C), so the upsert saw no B row and inserted a new
    // one. Upsert-first would instead have UPDATED the old B row and then the
    // patch would have found nothing to rename.
    const fronts = db.rows.map((r) => r.front).sort();
    expect(fronts).toEqual(["B", "C"]);
    expect(db.rows.find((r) => r.front === "C")).toMatchObject({
      back: "moved",
    });
    expect(db.rows.find((r) => r.front === "B")).toMatchObject({
      back: "fresh B",
    });
  });

  it("combined request: all three phases compose into one five-field response", async () => {
    const db = createInMemoryDb([
      manualRow("Delete me", "d"),
      manualRow("Rename me", "r"),
      manualRow("Update me", "stale back"),
    ]);
    state.client = db.client;

    const res = await POST(
      makeRequest({
        delete_fronts: ["Delete me"],
        patches: [
          { old_front: "Rename me", new_front: "Renamed", new_back: "r2" },
        ],
        cards: [
          { front: "Update me", back: "fresh back" }, // existing → update
          { front: "Brand new", back: "n" }, // absent → insert
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      inserted: 1,
      updated: 1,
      deleted: 1,
      patched: 1,
      skipped_patches: [],
    });
    const fronts = db.rows.map((r) => r.front).sort();
    expect(fronts).toEqual(["Brand new", "Renamed", "Update me"]);
    expect(db.rows.find((r) => r.front === "Update me")).toMatchObject({
      back: "fresh back",
    });
  });
});
