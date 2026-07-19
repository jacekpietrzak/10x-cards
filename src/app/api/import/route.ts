import { NextResponse } from "next/server";
import { isAuthorizedImportRequest } from "@/lib/auth/import-auth";
import { importRequestSchema } from "@/lib/schemas/import";
import {
  listManualFlashcards,
  processImportRequest,
} from "@/lib/services/flashcards.service";
import { createAdminClient } from "@/utils/supabase/admin";

// node:crypto (constant-time compare, via the import-auth helper) and the
// service-role client both require the Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";

// The patch phase runs sequentially (~2 round trips per patch), so a request at
// the 100-patch cap can outlast the default timeout. Realistic diffs are a few
// ops; this ceiling only exists so the cap cannot 504.
export const maxDuration = 60;

/**
 * POST /api/import
 *
 * Machine-to-machine flashcard CRUD for an external personal-knowledge tool.
 * Authenticated by a static bearer token (`Authorization: Bearer <IMPORT_API_KEY>`);
 * all rows are written for the single configured `IMPORT_USER_ID` via a
 * service-role client that bypasses RLS, so `user_id` is never read from the
 * request body.
 *
 * Request body — three optional arrays (max 100 each), at least one non-empty:
 * - `cards: [{ front, back }]` — upserted on `(user_id, front)`.
 * - `delete_fronts: [front]` — deleted by front.
 * - `patches: [{ old_front, new_front, new_back }]` — renamed in place, keeping
 *   the row id and all FSRS state.
 *
 * Processing order is deterministic and best-effort: **deletes → patches →
 * upserts**, with no enclosing transaction (see plan Decision 3). Every phase is
 * idempotent, so a caller recovers from a 500 by re-sending the same diff.
 *
 * Safety invariant: delete and patch only ever touch `source='manual'` rows —
 * enforced server-side in every query. AI-generated cards (`ai-full`,
 * `ai-edited`) are unreachable through those operations. The upsert path keeps
 * its pre-existing source-agnostic behavior for backward compatibility.
 *
 * Responses: 200 `{ inserted, updated, deleted, patched, skipped_patches }` —
 * all five fields always present, a strict superset of the old
 * `{ inserted, updated }`. Errors: 400 `{ error }` (malformed JSON, or Zod —
 * including the all-empty request and the `delete_fronts` overlap guards),
 * 401 `{ error }` (auth), 500 `{ error }` (misconfiguration, or a DB error —
 * partial writes are possible, and retrying the same body is safe).
 * Deliberately no 503 — the bearer token is the only gate (no feature-flag
 * check), so the contract stays stable for the external tool.
 */
export async function POST(request: Request) {
  // 1. Auth — fail closed. A missing IMPORT_API_KEY rejects everything.
  if (!isAuthorizedImportRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Config — the single target user must be configured.
  const importUserId = process.env.IMPORT_USER_ID;
  if (!importUserId) {
    console.error("IMPORT_USER_ID is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // 3. Parse + validate. Malformed JSON → 400 (the sibling route returns 500
  //    here). Validation is all-or-nothing: one bad card rejects the batch.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = importRequestSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues }, { status: 400 });
  }

  // 4. Write. Service-role client bypasses RLS; processImportRequest hard-scopes
  //    every operation to importUserId, and delete/patch additionally to
  //    source='manual'.
  try {
    const supabase = createAdminClient();
    const response = await processImportRequest(
      result.data,
      importUserId,
      supabase,
    );
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Do not log the token or full card contents.
    console.error("Error in POST /api/import:", error);
    return NextResponse.json(
      { error: "An error occurred while importing flashcards." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/import
 *
 * Machine-to-machine read counterpart of POST: returns the current manual
 * flashcards for the configured `IMPORT_USER_ID`, so the external
 * personal-knowledge tool can diff prod state against its source of truth.
 * Same bearer auth as POST (`Authorization: Bearer <IMPORT_API_KEY>`), same
 * service-role client — and the same safety invariant: the query is hard-scoped
 * `user_id = IMPORT_USER_ID AND source = 'manual'`, so AI-generated cards
 * (`ai-full`, `ai-edited`) are never returned. The filter is not configurable;
 * there are no query params.
 *
 * Response: 200 `{ cards: [{ front, back }], count, truncated }` — all three
 * fields always present. `cards` in DB order (no server-side sorting), no ids,
 * FSRS state, or timestamps. Soft cap 500 rows: if more exist, the first 500
 * are returned with `truncated: true`. An empty result is a 200 with
 * `{ cards: [], count: 0, truncated: false }`, never a 4xx.
 * Errors: 401 `{ error }` (auth, mirroring POST), 500 `{ error }`
 * (misconfiguration or DB error).
 *
 * Reading the Authorization header makes this handler dynamic — Next 15 does
 * not cache it, so responses always reflect current DB state.
 */
export async function GET(request: Request) {
  // 1. Auth — fail closed, identical gate to POST.
  if (!isAuthorizedImportRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Config — the single target user must be configured.
  const importUserId = process.env.IMPORT_USER_ID;
  if (!importUserId) {
    console.error("IMPORT_USER_ID is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // 3. Read. Service-role client bypasses RLS; listManualFlashcards hard-scopes
  //    the query to importUserId and source='manual'.
  try {
    const supabase = createAdminClient();
    const response = await listManualFlashcards(importUserId, supabase);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    // Do not log the token or card contents.
    console.error("Error in GET /api/import:", error);
    return NextResponse.json(
      { error: "An error occurred while listing flashcards." },
      { status: 500 },
    );
  }
}
