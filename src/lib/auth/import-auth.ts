import { createHash, timingSafeEqual } from "node:crypto";

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
 * Bearer-token gate for the machine-auth /api/import route (POST and GET).
 *
 * Fail-closed: a missing IMPORT_API_KEY env var, a missing/malformed
 * Authorization header, or a token mismatch all return false. The env var is
 * read at call time (not module load) so tests and env refreshes behave
 * predictably. Requires the Node.js runtime (node:crypto).
 */
export function isAuthorizedImportRequest(request: Request): boolean {
  const expectedKey = process.env.IMPORT_API_KEY;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!expectedKey || !token || !secretsMatch(token, expectedKey)) {
    return false;
  }

  return true;
}
