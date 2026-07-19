import { NextResponse } from "next/server";
import { isAuthorizedImportRequest } from "@/lib/auth/import-auth";
import { importRequestSchema } from "@/lib/schemas/import";
import { processImportRequest } from "@/lib/services/flashcards.service";
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
