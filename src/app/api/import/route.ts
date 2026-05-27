import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { importRequestSchema } from "@/lib/schemas/import";
import { importFlashcards } from "@/lib/services/flashcards.service";
import { createAdminClient } from "@/utils/supabase/admin";

// node:crypto (constant-time compare) and the service-role client both require
// the Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";

/**
 * Constant-time comparison of two secrets.
 *
 * Both values are hashed to fixed-length SHA-256 digests before comparing:
 * `timingSafeEqual` throws on unequal-length buffers, and length-guarding raw
 * tokens would leak the key length. Hashing to a fixed 32 bytes removes both
 * problems. The real security boundary is the entropy of IMPORT_API_KEY; this
 * is defense-in-depth.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

/**
 * POST /api/import
 *
 * Machine-to-machine flashcard import for an external personal-knowledge tool.
 * Authenticated by a static bearer token (`Authorization: Bearer <IMPORT_API_KEY>`);
 * all rows are written for the single configured `IMPORT_USER_ID` via a
 * service-role client that bypasses RLS, so `user_id` is never read from the
 * request body. Cards are upserted on `(user_id, front)` by `importFlashcards`.
 *
 * Responses: 200 `{ inserted, updated }` | 400 `{ error }` | 401 `{ error }` |
 * 500 `{ error }`. Deliberately no 503 — the bearer token is the only gate
 * (no feature-flag check), so the contract stays stable for the external tool.
 */
export async function POST(request: Request) {
  // 1. Auth — fail closed. A missing IMPORT_API_KEY rejects everything.
  const expectedKey = process.env.IMPORT_API_KEY;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!expectedKey || !token || !secretsMatch(token, expectedKey)) {
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

  // 4. Write. Service-role client bypasses RLS; importFlashcards hard-scopes
  //    every operation to importUserId.
  try {
    const supabase = createAdminClient();
    const response = await importFlashcards(
      result.data.cards,
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
