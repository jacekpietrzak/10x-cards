# Plan: GET /api/import — machine-auth read endpoint

## Overview

Add a read counterpart to the machine-auth import endpoint: `GET /api/import`, authenticated by the same static bearer token (`Authorization: Bearer <IMPORT_API_KEY>`), returning the current `source='manual'` flashcards for the configured `IMPORT_USER_ID`. The external life-os caller uses it to diff prod DB state against lesson `## Self-check (Q/A)` blocks — closing the verification gap left after the full-CRUD extension (plan `10x-cards-full-crud.md`, shipped 2026-07-19), where DB state could only be trusted transitively via the round-trip rename test.

Response contract (locked with the life-os side): `{ "cards": [{ "front", "back" }], "count": <n>, "truncated": <bool> }` — all three fields always present. `cards` in DB order (no server-side sorting), no IDs, no FSRS state, no source field, no timestamps. Soft cap 500 rows: if more matching rows exist, return the first 500 with `truncated: true`. Empty result is a 200 with `{ cards: [], count: 0, truncated: false }`. Status codes: 200 success, 401 bad/missing bearer (mirroring POST exactly), 500 DB error or missing `IMPORT_USER_ID`.

The safety invariant carries over unchanged from the CRUD plan: the query is hard-scoped `.eq("user_id", importUserId).eq("source", "manual")` — AI cards (`ai-full`, `ai-edited`) are never returned, and the filter is not configurable (no query params).

The bearer-auth block currently lives inline in the POST handler ([route.ts:25-29](src/app/api/import/route.ts#L25-L29) `secretsMatch` + the header-parse/env gate at [route.ts:65-74](src/app/api/import/route.ts#L65-L74)). The task spec authorizes extracting it — and only it — into `src/lib/auth/import-auth.ts` so both POST and GET call one helper. The SHA-256 + `timingSafeEqual` internals move byte-identical; no other POST behavior changes.

Out of scope: pagination beyond the 500 soft cap, sorting, filtering params, exposing any field beyond `front`/`back`, touching AI-generation code paths, changing POST semantics.

## Design decisions

### Decision 1 (RESOLVED 2026-07-19): Truncation detection via `count: "exact"` + `.limit(500)`

**Choice:** Single query: `.select("front, back", { count: "exact" }).eq("user_id", …).eq("source", "manual").limit(500)`. Response `count` = `cards.length` (rows returned); `truncated` = `(exactCount ?? 0) > 500`.

**Rationale:** One round trip, and the `{ count: "exact" }` pattern is established repo precedent ([flashcards.service.ts:77-85](src/lib/services/flashcards.service.ts#L77-L85)). The alternative (fetch 501, slice) avoids the count header but is a novel pattern here. Realistic ceiling for manual cards is <100, so the count overhead is irrelevant.

**Trade-offs:** None meaningful at this scale.

### Decision 2 (RESOLVED 2026-07-19): Auth helper shape — `isAuthorizedImportRequest(request): boolean`

**Choice:** `src/lib/auth/import-auth.ts` exports one function that performs the full gate: read `process.env.IMPORT_API_KEY`, parse the `Authorization: Bearer` header, and run the moved-verbatim `secretsMatch` (SHA-256 both sides → `timingSafeEqual`). Returns boolean; the route maps `false` → 401. POST's auth section becomes a single call; its observable behavior (fail-closed on missing env, missing header, bad token) is byte-for-byte equivalent.

**Rationale:** Extracting only `secretsMatch` would force GET to duplicate the header-parse/env gate — a second copy of security-adjacent logic, which is what extraction is meant to prevent. Extracting the whole gate keeps exactly one copy of every auth line. The spec permits extraction of "the bearer-auth block"; the gate is that block.

**Trade-offs:** POST's route file shrinks; its auth tests now exercise the helper transitively (they set env + headers, so they keep passing unmodified).

### Decision 3 (RESOLVED 2026-07-19): GET handler typed as `Request`, not `NextRequest`

**Choice:** `export async function GET(request: Request)` — matching the existing POST signature, not the spec's literal `NextRequest`.

**Rationale:** The existing POST uses plain `Request`, and the whole test suite constructs `new Request(...)` objects. `NextRequest` adds nothing here (no cookies/geo/nextUrl used) and would force test churn. Recorded as a deliberate micro-deviation to report back.

## Implementation order

| Step | Title | Scope | Effort | Schema change? | Depends on | Status |
|---|---|---|---|---|---|---|
| 1 | Extract bearer-auth helper to `src/lib/auth/import-auth.ts` | auth | 30 min | No | — | Shipped (2026-07-20) |
| 2 | Service: `listManualFlashcards` | services | 30 min | No | — | Shipped (2026-07-20) |
| 3 | Route: `GET /api/import` handler | API | 30 min | No | 1, 2 | Shipped (2026-07-20) |
| 4 | Tests: service unit + route unit/integration | tests | 1.5 h | No | 3 | Shipped (2026-07-20) |
| 5 | Docs note, deploy, prod smoke | docs/deploy | 30 min | No | 4 | Shipped (2026-07-20) |

Steps are small enough to ship in one session with one commit per step (matching the CRUD-plan discipline: lint + full test suite green before each commit).

## Progress log

**2026-07-19 — Plan created.** Plan drafted via `/plan-interview` (lite, autonomous — contract fully locked by the task spec; the three genuinely open micro-decisions resolved above). Ready for `/plan-review` (single pass per spec) before implementation begins. **Up next:** step 1.

**2026-07-19 — /plan-review pass (verdict: GO).** Codebase-verified. One WARNING folded into Step 4: both test mocks need concrete read-path extensions (select-arg/limit capture in the unit mock; select-op data + count in the integration mock). Verified clean: middleware allowlist at [middleware.ts:18](src/middleware.ts#L18) is path-based so GET passes untouched; Next 15 GET handlers are uncached by default and reading the Authorization header forces dynamic rendering, so no `force-dynamic` export is needed; auth extraction keeps route tests green (they drive auth via env + headers, not mocks). Implementation may begin. **Up next:** step 1.

**2026-07-20 — Steps 1–4 shipped (one session, one commit each).** Step 1 (f675dc5): [import-auth.ts](src/lib/auth/import-auth.ts) with `isAuthorizedImportRequest`; `secretsMatch` moved byte-identical; POST rewired, 107/107 tests unmodified. Step 2 (453be85): [listManualFlashcards](src/lib/services/flashcards.service.ts) per Decision 1 (`count: "exact"` + `MANUAL_LIST_CAP = 500`). Step 3 (c5358ff): GET handler mirroring POST's auth/config/error structure; `npm run build` green. Step 4 (deb3ab3): both mocks extended exactly per the review spec; 5 service-unit + 8 route-unit + 5 integration tests added — 125/125 total, lint clean. No deviations beyond the two planned micro-deviations (param order, `Request` type). **Up next:** step 5.

**2026-07-20 — Step 5 shipped; plan complete.** [DEPLOYMENT.md](DEPLOYMENT.md) gained a "Kontrakt endpointu odczytu (GET)" subsection; docs commit e6b5b23 pushed with the four code commits; GitHub Actions run 29705368587 green through all four stages (Lint → Unit Tests → Build → Deploy). Prod smoke against `10x-cards.jackpietrzak.com/api/import`: no-auth GET → 401; bearer GET → 200 with exactly the expected 16 manual cards (`count: 16`, `truncated: false`, cards carry only `front`/`back` keys). Beyond plan acceptance: the full 10-check CRUD smoke script also re-run against prod (all green), proving the Step 1 auth extraction left POST behavior intact end-to-end, and a final GET confirmed `count: 16` after the script's self-cleanup. **Up next:** none — all 5 steps shipped; plan complete.

## Step details

### Step 1: Extract bearer-auth helper

Create `src/lib/auth/import-auth.ts`:

- Move `secretsMatch` from [route.ts:25-29](src/app/api/import/route.ts#L25-L29) **byte-identical** (including its doc comment) — the SHA-256 + `timingSafeEqual` internals are on the do-not-touch list.
- Export `isAuthorizedImportRequest(request: Request): boolean` implementing the exact gate currently at [route.ts:65-74](src/app/api/import/route.ts#L65-L74): read `IMPORT_API_KEY` at call time (fail closed if unset), parse `Authorization` header with the same `startsWith("Bearer ")` / `slice` logic, return `secretsMatch(token, expectedKey)`.
- Rewire POST: replace the inline block with `if (!isAuthorizedImportRequest(request)) return 401`. Remove the now-unused `node:crypto` import from the route. Keep `export const runtime = "nodejs"` (the helper still needs node:crypto; adjust the comment's wording only if it now misleads).

Acceptance: all existing tests pass unmodified (they exercise auth via env + headers, not via mocking the block); `npm run lint` clean; a diff of the route shows the auth section replaced by exactly one call and no other logic changes.

### Step 2: Service — `listManualFlashcards`

In [src/lib/services/flashcards.service.ts](src/lib/services/flashcards.service.ts), add:

```ts
export async function listManualFlashcards(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ cards: { front: string; back: string }[]; count: number; truncated: boolean }>
```

- Query per Decision 1: `.from("flashcards").select("front, back", { count: "exact" }).eq("user_id", userId).eq("source", "manual").limit(500)`. No `.order()` — DB order per contract.
- On error: log via `console.error` (no card content), throw — same pattern as the file's other functions. Read-only, no transaction.
- Return `{ cards: data ?? [], count: (data ?? []).length, truncated: (count ?? 0) > 500 }`.
- Parameter order `(userId, supabase)` follows the file's dominant convention (`listFlashcards`, `deleteManualFlashcards`). The task spec writes `listManualFlashcards(supabase, userId)` — follow the file convention, record as micro-deviation.
- Extract the 500 into a named `MANUAL_LIST_CAP` const with a one-line comment (safety net, not pagination).

Acceptance: lint clean; unit-testable via the existing mock client pattern.

### Step 3: Route — GET handler

In [src/app/api/import/route.ts](src/app/api/import/route.ts), add `export async function GET(request: Request)` below POST:

1. Auth via `isAuthorizedImportRequest` → 401 `{ error: "Unauthorized" }` (identical body/status to POST).
2. `IMPORT_USER_ID` unset → `console.error` + 500 `{ error: "Server misconfiguration" }` (identical to POST).
3. `createAdminClient()` → `listManualFlashcards(importUserId, supabase)` → 200 with the result verbatim.
4. Catch → `console.error("Error in GET /api/import:", error)` + 500 `{ error: "An error occurred while listing flashcards." }`.

Doc comment on GET mirroring POST's style: purpose (machine-read for external diffing), the `source='manual'` invariant, the three-field response, the 500-row soft cap, status codes. The existing `runtime` / `maxDuration` exports already cover the whole route file — do not duplicate.

Acceptance: lint clean; `npm run build` passes; POST behavior untouched (diff shows only the added GET + auth call from Step 1).

### Step 4: Tests

- [flashcards.service.test.ts](src/lib/services/__tests__/flashcards.service.test.ts): new describe for `listManualFlashcards` using the file's existing mock-client pattern — assert `.eq("user_id", userId)` AND `.eq("source", "manual")` both applied, `.limit(500)` applied, `select` is `front, back` with `count: "exact"`; return shape on: normal rows (`truncated: false`), empty (`{cards: [], count: 0, truncated: false}`), mocked `count: 501+` (`truncated: true`, count = returned length), DB error → throws.
- [route.test.ts](src/app/api/import/__tests__/route.test.ts): GET describe — 401 missing header, 401 wrong token, 401 when `IMPORT_API_KEY` unset, 500 when `IMPORT_USER_ID` unset, 200 happy path passing the mocked service result through verbatim, 500 on service throw. Mock `listManualFlashcards` alongside the existing `processImportRequest` mock.
- [route.integration.test.ts](src/app/api/import/__tests__/route.integration.test.ts): real route + real service over the in-memory table — manual cards returned, `ai-full`/`ai-edited` rows excluded, other-user rows excluded, three-field shape exact. Extend the in-memory mock only if it lacks `select`-with-count/`limit` support; keep extensions minimal.

**Note (added 2026-07-19 review):** both mocks verifiably need extension — specs: (a) service-test mock: `select()` at [flashcards.service.test.ts:84](src/lib/services/__tests__/flashcards.service.test.ts#L84) captures no args and `limit()` at [:114](src/lib/services/__tests__/flashcards.service.test.ts#L114) discards `n` — record `(columns, options)` and the limit value so Step 4 can assert them; (b) integration mock: the bare-select branch of the thenable at [route.integration.test.ts:125-127](src/app/api/import/__tests__/route.integration.test.ts#L125-L127) returns `{data: null, error: null}` with no `count` — extend it to return matched rows (post-`eq`/`neq`, sliced to `limitN`) plus `count` = matched rows **before** the limit slice. Both extensions must leave all 107 existing tests untouched.

Acceptance: full suite green (baseline 107 tests + new), lint clean, prod build passes. No production code changes in this step.

### Step 5: Docs, deploy, prod smoke

- [DEPLOYMENT.md](DEPLOYMENT.md): short GET subsection under the existing `/api/import` contract section — auth, response shape, cap, status codes.
- Commit(s) → push `main` → watch **GitHub Actions** (not Vercel) per the deploy gotcha in CLAUDE.md.
- Prod smoke from terminal: `curl` no-auth → expect `401`; `curl -H "Authorization: Bearer $IMPORT_API_KEY"` → expect 200 with 16 manual cards (the 8+8 from the two 10xdevs30 prework lessons), `truncated: false`.

Acceptance: both smoke checks pass against `10x-cards.jackpietrzak.com`; report includes commit hash + smoke output.

## Pitfalls

- **Auth-block regression risk is concentrated in Step 1.** The move must be mechanical. Verify with a diff that `secretsMatch` is byte-identical and the gate conditions (`!expectedKey || !token || !secretsMatch(...)`) are preserved exactly — the fail-closed ordering matters.
- **`.limit()` vs `.range()`:** use `.limit(500)`; `listFlashcards`'s range-error handling (416/PGRST116) is a pagination artifact and does not apply to a plain limit.
- **In-memory integration mock may not implement `select` with `{ count: "exact" }`.** If so, extend it to return `count` = matched rows before limit — do not silently return `null` count, which would make `truncated` untestable at the integration level.
- **Smoke-before-deploy window:** hitting GET on prod before the deploy lands returns 405 (no handler). Deploy first, then smoke — same transitional note as the CRUD plan's Step 5.

## Out of scope (v1)

- Real pagination (cursor/offset) — 500 cap is a safety net; manual-card ceiling is <100.
- Any filter/sort query params — the `source='manual'` + `IMPORT_USER_ID` scoping is fixed by design.
- Returning IDs/FSRS/timestamps — life-os diffs on `(front, back)` only.
