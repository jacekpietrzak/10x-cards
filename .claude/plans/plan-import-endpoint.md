# Plan: Machine-auth flashcard import endpoint (`POST /api/import`)

## Overview

Add a single machine-to-machine endpoint, `POST /api/import`, that lets an external personal-knowledge tool push curated flashcards into the app programmatically — no browser session, no Supabase user login. This is a personal, single-user integration. The external tool will POST to `https://10x-cards.jackpietrzak.com/api/import`, so the request/response contract must be exact.

Authentication is a static bearer token (`Authorization: Bearer <IMPORT_API_KEY>`) compared in constant time. All rows are written for one configured user (`IMPORT_USER_ID`) using a **service-role** Supabase client that bypasses Row-Level Security. Because that client bypasses RLS, every database operation is hard-scoped to `IMPORT_USER_ID` in application code, and `user_id` is never read from the request body.

Each card is upserted on the natural key `(user_id, front)`: if a card with that front already exists for the user, its `back` is updated (and `updated_at` refreshes via the existing DB trigger); otherwise a new card is inserted with `source = "manual"` and `generation_id = null`. There is no unique constraint on `(user_id, front)` in the schema, so the upsert is done manually (SELECT existing fronts → partition → INSERT new / UPDATE existing) rather than via Postgres `ON CONFLICT`. This avoids a migration, gives exact `{inserted, updated}` counts, and is race-free for a single serial pusher.

Validation reuses the app's flashcard length limits (`front <= 200`, `back <= 500`) plus trimming and a non-empty-front guard (front is now the dedup key). Validation is all-or-nothing: if any card in the batch is invalid, the whole batch is rejected with 400 and nothing is written. Batch size is 1–100 cards.

Scope is deliberately tight: one endpoint, one service function, a service-role client helper, a Zod schema, unit tests, and env documentation. No decks/tags, no rate limiting, no multi-user key tables, no UI changes.

## Problem statement

The user maintains a separate personal-knowledge system and wants it to push curated flashcards into 10x-cards automatically. The existing write path (`POST /api/flashcards`) requires a Supabase auth cookie from a browser session ([src/app/api/flashcards/route.ts:70](../../src/app/api/flashcards/route.ts#L70) calls `getAuthenticatedUserId()`), which a headless tool cannot supply. A separate, key-authenticated, idempotent import surface is needed so repeated pushes converge instead of duplicating.

## Architectural decisions

### Decision 1 (RESOLVED 2026-05-27): Manual upsert, no unique constraint / migration

**Choice:** Implement the `(user_id, front)` upsert in application code: a **per-card existence lookup** (`.eq("user_id", …).eq("front", …)`), partition the batch into updates (front already exists) and inserts (new front), run a single batch `INSERT` plus per-row `UPDATE`s.

**Rationale:** No unique index on `(user_id, front)` exists (verified across all migrations in [supabase/migrations/](../../supabase/migrations/) — only plain indexes on `user_id`, `generation_id`, `due`, `state`). Native `ON CONFLICT` would require a `UNIQUE(user_id, front)` migration that (a) fails if duplicate fronts already exist in prod and (b) makes the required `{inserted, updated}` response hard to compute (a single upsert can't cleanly distinguish new vs existing rows without the `xmax = 0` system-column trick). The manual approach yields exact counts and needs no schema change.

**Trade-offs:** The one-row-per-`(user_id, front)` invariant is enforced only in app code, not the DB, and the write is not atomic under concurrency. Irrelevant here: one user, one tool, serial POSTs. Upgrade path: add the unique index + native upsert only if this ever becomes multi-writer.

**Note (added 2026-05-27 review):** The existence lookup uses a per-card `.eq("front", …)`, ~~a batched `front IN (…)`~~. `supabase-js`'s `.in()` only quote-wraps values containing `[,()]` and does **not** escape an embedded `"` ([PostgrestFilterBuilder.js:152-164](../../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js#L152)), so a front with a double-quote would silently miss its existing row and create a duplicate — defeating idempotency. `.eq()` percent-encodes the operand and is safe for arbitrary text. Per-card lookup also avoids PostgREST's default ~1000-row response cap that a "fetch all fronts" alternative would hit. See Pitfalls.

### Decision 2 (RESOLVED 2026-05-27): Best-effort writes + idempotent retry (no transaction)

**Choice:** No Postgres transaction/RPC wrapping insert+updates. On a mid-batch DB failure, return 500; the tool re-POSTs.

**Rationale:** The import is idempotent (upsert on front), so a retry fully reconciles — already-written rows become no-op `back` updates, previously-failed updates get applied. A true transaction would require a SQL function/RPC, reintroducing the migration we rejected in Decision 1. The "no partial writes" guarantee your spec asked for is provided at the **validation** layer (400 rejects the whole batch before any write), which is where partial writes actually matter.

**Trade-offs:** A failed run can leave the DB in a transient partial state until the next push. Self-healing on retry; acceptable for a personal tool.

### Decision 3 (RESOLVED 2026-05-27): Constant-time compare via hash-then-`timingSafeEqual`; fail closed

**Choice:** Hash both the provided token and `IMPORT_API_KEY` to fixed-length SHA-256 digests, then compare with `crypto.timingSafeEqual`. If `IMPORT_API_KEY` is unset, reject (never accept).

**Rationale:** `timingSafeEqual` throws on unequal-length buffers and naive length-guarding leaks key length; hashing to a fixed 32 bytes removes both problems. **The real security boundary is the entropy of `IMPORT_API_KEY`** (≥256-bit random), not the timing property — over the public internet the timing side-channel is unexploitable. Constant-time compare is correct defense-in-depth and a stated requirement; key entropy is the load-bearing control and is the headline deploy step.

**Trade-offs:** None meaningful.

### Decision 4 (RESOLVED 2026-05-27): No feature-flag gate

**Choice:** The bearer token is the only gate. The endpoint does **not** check `isFeatureEnabled("flashcards")` like the sibling routes do.

**Rationale:** Keeps the response contract exactly `200 / 400 / 401 / 500` with no surprise `503` for the external tool. The `flashcards` flag semantically gates the user-facing UI feature, not a separate machine surface. Kill-switch is rotating/unsetting `IMPORT_API_KEY` (→ fail-closed 401).

## Design decisions

### Validation (RESOLVED 2026-05-27)

`front`: `.trim().min(1, …).max(200, …)` — trimmed and non-empty because it is the dedup key. `back`: `.trim().max(500, …)`. Batch: 1–100 cards. **No HTML sanitization** — card text renders as escaped React text nodes (`{card.front}` in [src/components/session/FlashcardViewer.tsx:28](../../src/components/session/FlashcardViewer.tsx#L28); no `dangerouslySetInnerHTML` anywhere in `src/`), so stripping HTML would only mutate the user's curated content for zero security gain. Unknown keys (e.g. a smuggled `user_id`) are stripped by Zod's default object behavior and never reach the service.

### Response shape (RESOLVED 2026-05-27)

Exactly `{ "inserted": <number>, "updated": <number> }` on 200 — no extra fields, since the external tool's parser depends on it. Errors return `{ "error": … }` (matching sibling routes); the tool keys off status code.

### New-card field defaults (RESOLVED 2026-05-27)

Inserts mirror [createFlashcards()](../../src/lib/services/flashcards.service.ts#L11): `source = "manual"`, `generation_id = null`, `stability = null`, `difficulty = null`, `due = now`, `lapses = 0`, `state = 0`, `last_review = null` — making imported cards immediately reviewable. Updates set **only** `back`; `updated_at` refreshes via the `set_updated_at` trigger ([migration](../../supabase/migrations/20240628123001_create_flashcards_table.sql#L32)).

## Implementation order

| Step | Title | Scope | Effort | Schema change? | Depends on | Status |
|---|---|---|---|---|---|---|
| 1 | Service-role Supabase client helper | `utils/supabase` | 30 min | No | — | Shipped |
| 2 | Import Zod schema | `lib/schemas` | 20 min | No | — | Shipped |
| 3 | `importFlashcards` service function | `lib/services` | 1 hr | No | — | Shipped |
| 4 | `POST /api/import` route handler | `app/api` | 1 hr | No | 1, 2, 3 | Pending |
| 4.1 | Allowlist `/api/import` in middleware | `middleware` | 5 min | No | — | Pending |
| 5 | Unit tests (route + service) | Tests | 1.5 hr | No | 3, 4, 4.1 | Pending |
| 6 | Env documentation + deploy steps | Docs | 20 min | No | — | Pending |

## Progress log

**2026-05-27 — Plan created.** Plan drafted via `/plan-interview` after `/brainstorm`, `/best-persona`, `/best-practices`, and `/first-principles` passes resolved all open decisions (upsert mechanism, feature flag, validation strictness, DB atomicity, Vercel env scope). Ready for `/plan-review` before implementation begins. **Up next:** step 1.

**2026-05-27 — Reviewed via `/plan-review` (standard depth).** Folded 1 CRITICAL + 1 WARNING + 2 notes. CRITICAL: the existence check used `.in("front", …)`, which doesn't escape embedded `"` and would create duplicate rows — switched step 3 + Decision 1 to per-card `.eq("front", …)` lookups. WARNING: all five tests mocked `importFlashcards`, leaving the upsert logic uncovered — added service-level tests (step 5, tests 6–9) so the dedup/classification/scoping/quote-safe logic is exercised. Notes folded: no route-test precedent (write 401 test first as smoke check; Node 22 globals verified present), and test 5 now asserts `user_id` stripping at both Zod sites. Verdict now **GO**. **Up next:** step 1.

**2026-05-27 — Reviewed via `/plan-review` pass 2 (validation).** Pass-1 fixes validated against `supabase-js` (`.limit(1).maybeSingle()` is the documented-correct pattern). Found 1 CRITICAL the first pass missed: the auth middleware ([middleware.ts:74](../../src/middleware.ts#L74)) 307-redirects cookieless requests to `/login`, and `/api/import` was not in `PUBLIC_API_PATHS` — so the handler (and bearer auth) would never run. Added **step 4.1** to allowlist it (precedent: `/api/health`), plus a Pitfall. Also folded a WARNING: parallelize the per-card lookups/updates with `Promise.all` (step 3 note) to avoid Vercel timeout risk on large batches. Verdict now **GO**. **Up next:** step 1.

**2026-05-27 — Grounded against external sources (web search).** All four load-bearing claims corroborated: `timingSafeEqual` throws on unequal lengths (the hash-then-compare approach is the more robust documented pattern); `supabase-js` `.in()` doesn't escape embedded quotes ([postgrest-js #164](https://github.com/supabase/postgrest-js/issues/164)); Next.js middleware redirects before the route handler runs ([Next.js docs](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware)); service-role always bypasses RLS and is server-only. Folded two doc strengthenings: the #164 citation into the `.in()` Pitfall, and an explicit "service-role bypasses RLS — no DB backstop" entry in Known Risks (accepted trade-off). No structural changes — grounding confirmed the design. **Up next:** step 1.

**2026-05-27 — Step 2 shipped + reviewed via `/plan-review` pass 4.** Created [src/lib/schemas/import.ts](../../src/lib/schemas/import.ts): `importCardSchema` (`front` trimmed/non-empty/≤200, `back` trimmed/≤500) + `importRequestSchema` (`cards` 1–100), exporting `ImportCard`/`ImportRequest`. Verified Zod 3.25 `.trim()`-before-`.min/.max` ordering empirically, then ran 16 behavioral probes against the actual file via `vite-node` (all pass), incl. `user_id` stripping at both the top level and the card level. ESLint clean; 57/57 existing tests pass; `tsc` clean for this file (only the two pre-existing test-file failures remain). Review verdict **GO** — all downstream facts re-confirmed against live code: `FlashcardInsert` exists ([types.ts:8](../../src/lib/types.ts#L8)), `createFlashcards` FSRS defaults ([flashcards.service.ts:18-29](../../src/lib/services/flashcards.service.ts#L18)), `source` CHECK allows `manual`, no `(user_id,front)` unique index, `/api/import` not yet in `PUBLIC_API_PATHS`. Findings were all NOTES (no rework): empty-`back` allowance matches sibling routes and the `not null` column (empty string is non-null); 200-not-201 success is an intentional documented divergence. Folded 1 IDEA into Step 3 (annotate `toInsert` as `FlashcardInsert[]`). **Up next:** step 3 (`importFlashcards` service function).

**2026-05-27 — Step 3 shipped + reviewed via `/plan-review` pass 5 (standard depth).** Added `importFlashcards(cards, userId, supabase)` to [src/lib/services/flashcards.service.ts](../../src/lib/services/flashcards.service.ts): Map-dedup last-wins (warns on collapse) → parallel quote-safe `.eq("front")` lookups → partition into `FlashcardInsert[]` inserts (`source:"manual"`, FSRS defaults) vs `back`-only updates → batch insert + parallel updates → exact `{inserted, updated}`. Every query hard-scoped to `userId` (the only tenant boundary, since the service-role client bypasses RLS). ESLint clean; 57/57 tests pass; `tsc` clean for this file (only the two pre-existing test-file failures remain). Review verdict **GO** — all load-bearing DB facts re-confirmed live: `set_updated_at` BEFORE-UPDATE trigger fires on `back`-only updates, `source` CHECK allows `manual`, no `(user_id,front)` unique index, RLS policies are `authenticated`-role only (service-role bypasses → app scoping is load-bearing), and `'Question with "quotes"'` is a real tested card shape ([generation.service.test.ts:393](../../src/lib/services/__tests__/generation.service.test.ts#L393)) confirming why `.eq()` over `.in()` matters. Findings were all NOTES + 1 IDEA (folded: row `id` now in the update-failure log for traceability). Not yet runtime-exercised — no caller (Step 4) or test (Step 5) yet; that's the design. **Up next:** step 4 (`POST /api/import` route handler) — and its blocking sub-step 4.1 (allowlist `/api/import` in `PUBLIC_API_PATHS`), without which the handler is unreachable.

**2026-05-27 — Step 1 shipped + reviewed via `/plan-review` pass 3.** Created [src/utils/supabase/admin.ts](../../src/utils/supabase/admin.ts): `createAdminClient(): SupabaseClient<Database>` using the `@supabase/supabase-js` service-role constructor with `persistSession:false / autoRefreshToken:false`, throwing on missing `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. ESLint clean; `tsc` clean for this file (the only `tsc` errors are pre-existing failures in `flashcard.test.tsx` / `FlashcardGenerationView.test.tsx`, untouched). Review verdict **GO** — all load-bearing claims re-confirmed against current code (FSRS defaults in `createFlashcards`, `source` CHECK allows `manual`, no `(user_id,front)` unique index, `set_updated_at` BEFORE-UPDATE trigger, middleware 307 + `PUBLIC_API_PATHS` allowlist). Folded 1 WARNING (Step 5 route test must run under `// @vitest-environment node`, since vitest is jsdom-global) + 3 notes (no Supabase-chain-mock precedent yet; middleware match is `startsWith` not exact; `SupabaseClient` import-source diverges from a stale/unfollowable CLAUDE.md guideline — accepted). **Up next:** step 2 (Import Zod schema).

## Step details

### Step 1: Service-role Supabase client helper

Create `src/utils/supabase/admin.ts` exporting `createAdminClient(): SupabaseClient<Database>`. Use `createClient` from `@supabase/supabase-js` (matching how the service layer already imports the `SupabaseClient` type) with `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` and `auth: { persistSession: false, autoRefreshToken: false }`. Throw if either env var is missing.

Server-only by construction: `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix, so Next.js never inlines it into the client bundle. Add a doc comment stating the client bypasses RLS and must stay confined to server code. (`server-only` package is not installed; do not add a dependency — the prefix guarantee plus route-handler-only usage is the protection.)

**Acceptance:** `createAdminClient()` returns a typed client; throws a clear error when env is absent; file imports nothing client-side.

**Shipped 2026-05-27.** Implemented as specced ([src/utils/supabase/admin.ts](../../src/utils/supabase/admin.ts)). **Note (added 2026-05-27 review pass 3):** `SupabaseClient` is imported from `@supabase/supabase-js` — the only source of the service-role `createClient` constructor (`@supabase/ssr` offers only cookie-bound clients). This matches the existing service layer ([flashcards.service.ts:1](../../src/lib/services/flashcards.service.ts#L1)) but diverges from the CLAUDE.md guideline "use `SupabaseClient` from `src/utils/supabase/client.ts`", which is unfollowable as written since `client.ts` exports no such type. Accepted as-is; reconcile the guideline later if desired.

### Step 2: Import Zod schema

Create `src/lib/schemas/import.ts`:
- `importCardSchema = z.object({ front: z.string().trim().min(1, …).max(200, …), back: z.string().trim().max(500, …) })`
- `importRequestSchema = z.object({ cards: z.array(importCardSchema).min(1, …).max(100, …) })`
- Export inferred types `ImportCard`, `ImportRequest`.

Default (non-strict) object behavior strips unknown keys, including any `user_id`.

**Acceptance:** valid `{cards:[{front,back}]}` parses; empty/whitespace front, `back` > 500, `front` > 200, empty array, and >100 cards all fail `safeParse`; trimming is applied to parsed output.

**Shipped 2026-05-27.** Implemented as specced ([src/lib/schemas/import.ts](../../src/lib/schemas/import.ts)). `front: z.string().trim().min(1).max(200)`, `back: z.string().trim().max(500)` (no `.min()` — empty `back` allowed, matching the sibling POST/PUT schemas), `cards` array `.min(1).max(100)`; exports `ImportCard`/`ImportRequest`. ESLint clean; `tsc` clean for this file. **Note (added 2026-05-27 review pass 4):** behavior verified against the *actual* file via `vite-node` (16 probes incl. trim-before-length ordering, whitespace-only-front rejection, and `user_id` stripping at **both** the top level and the card level — the two sites Step 5 test 5 asserts). `back varchar(500) not null` ([migration:4](../../supabase/migrations/20240628123001_create_flashcards_table.sql#L4)) is satisfied by an empty string (non-null), so the no-`min` choice causes no DB violation. Verdict **GO**.

### Step 3: `importFlashcards` service function

Add to [src/lib/services/flashcards.service.ts](../../src/lib/services/flashcards.service.ts):

```
export async function importFlashcards(
  cards: { front: string; back: string }[],
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ inserted: number; updated: number }>
```

Logic:
1. Dedup by `front`, last-occurrence-wins, into a `Map<front, back>`. If dedup dropped any rows, `console.warn` with the collapsed count (surfaces upstream PKS data issues).
2. **(revised 2026-05-27 review)** For each deduped front, look it up individually: `select id … .eq("user_id", userId).eq("front", front).limit(1).maybeSingle()`. On unexpected error, log + throw. **Do not use `.in("front", …)`** — it fails to escape embedded `"` and would create duplicates (see Decision 1 note + Pitfalls). `.eq()` is quote-safe.
3. Partition from the lookups: front found → `{ id, back }` update list; not found → insert row with `user_id: userId`, `source: "manual"`, `generation_id: null`, and the FSRS defaults from `createFlashcards` (`due = new Date().toISOString()`, `lapses: 0`, `state: 0`, others null).
4. If inserts exist, one batch `.insert(toInsert)`. On error, log + throw.
5. For each update, `.update({ back }).eq("id", id).eq("user_id", userId)`. On error, log + throw.
6. Return `{ inserted: toInsert.length, updated: toUpdate.length }`.

**Note (added 2026-05-27 review pass 2):** Run the per-card lookups (item 2) with `Promise.all`, and likewise the updates (item 5), instead of a sequential `await` loop — this collapses wall-clock to roughly one round-trip regardless of batch size and avoids Vercel function-timeout risk on near-100-card batches of existing cards. ≤100 concurrent PostgREST calls is safe.

Add `FlashcardInsert` to the existing `@/lib/types` import. Every query carries `.eq("user_id", userId)` (or sets `user_id` on insert) — the hard tenant scope that substitutes for the RLS this client bypasses.

**Note (added 2026-05-27 review pass 4):** annotate the `toInsert` array as `FlashcardInsert[]` (the type exists at [types.ts:8](../../src/lib/types.ts#L8) but `createFlashcards` builds its insert inline without it, [flashcards.service.ts:18-29](../../src/lib/services/flashcards.service.ts#L18)). Typing it makes the compiler catch a misspelled/missing FSRS default — the same scoping/default class of bug the service tests guard against.

**Acceptance:** new fronts insert with correct defaults; existing fronts update only `back`; counts are exact; intra-batch dup collapse logs a warning; all queries scoped to `userId`; **a front containing `"` correctly matches its existing row (no duplicate)**.

**Shipped 2026-05-27.** Implemented in [src/lib/services/flashcards.service.ts](../../src/lib/services/flashcards.service.ts) exactly as specced: Map-dedup (last-wins, `console.warn` on collapse), parallel `Promise.all` per-card `.eq("user_id").eq("front").limit(1).maybeSingle()` lookups, partition into `FlashcardInsert[]` (annotated; `source:"manual"`, `generation_id:null`, FSRS defaults mirroring `createFlashcards`) vs `{id, back}[]`, one batch insert + parallel `back`-only updates, exact counts returned. `FlashcardInsert` added to the `@/lib/types` import. **Note (added 2026-05-27 review pass 5):** folded 1 IDEA — the update-failure `console.error` now includes the row `id` (a non-sensitive DB integer, not card content — safe under the don't-log-secrets Pitfall) for production traceability on a partial-write 500. The lookup uses `.limit(1)` *before* `.maybeSingle()` so a pre-existing duplicate `(user_id, front)` (possible — no DB unique constraint, and the legacy `POST /api/flashcards` doesn't dedupe on front) is tolerated rather than throwing; partition uses `existingId !== null` (not truthiness) so `id:0` would still classify correctly.

### Step 4: `POST /api/import` route handler

Create `src/app/api/import/route.ts` with `export const runtime = "nodejs"` (needed for `node:crypto` and the service-role client).

Order of operations:
1. **Auth.** Read `Authorization` header; require `Bearer ` prefix and a non-empty token. Compare against `process.env.IMPORT_API_KEY` with a `secretsMatch(provided, expected)` helper that SHA-256-hashes both then `timingSafeEqual`s the digests. Missing `IMPORT_API_KEY` → fail closed. Any failure → `401 { error: "Unauthorized" }`.
2. **Config.** `IMPORT_USER_ID` unset → `500 { error: "Server misconfiguration" }` (logged).
3. **Parse + validate.** `await request.json()` wrapped so malformed JSON → `400` (small improvement over the sibling route, which returns 500 on parse error). `importRequestSchema.safeParse`; on failure → `400 { error: issues }`.
4. **Write.** `createAdminClient()` → `importFlashcards(result.data.cards, IMPORT_USER_ID, supabase)`.
5. Return `200 { inserted, updated }`.
6. Catch-all → `500 { error: "An error occurred while importing flashcards." }` (logged). Do not log the token or full card contents.

**Acceptance:** contract matches exactly — `POST` with `Authorization: Bearer <key>` and `{cards:[{front,back}]}` returns `200 {inserted,updated}`; bad/missing key → 401; invalid body → 400; misconfig → 500. `user_id` is always `IMPORT_USER_ID`. **Requires step 4.1** — without it the handler is unreachable.

### Step 4.1: Allowlist `/api/import` in middleware (added 2026-05-27 review pass 2)

**Blocker — the endpoint does not work without this.** The auth middleware runs on every non-static path including `/api/import` ([matcher at middleware.ts:119](../../src/middleware.ts#L119)). A cookieless machine request has no Supabase session, so `user` is null and the middleware **307-redirects to `/login`** ([middleware.ts:74-82](../../src/middleware.ts#L74)) before the route handler — and thus the bearer-token check — ever runs.

Add `"/api/import"` to `PUBLIC_API_PATHS` ([middleware.ts:14](../../src/middleware.ts#L14)), alongside the existing `/api/health` (the precedent for a cookieless public endpoint). "Public" here only means the middleware doesn't gate it; the bearer token in the route handler remains the real gate.

**Note (added 2026-05-27 review pass 3):** the public-API match is `pathname.startsWith(path)` ([middleware.ts:63-65](../../src/middleware.ts#L63)), not an exact match — so this also exempts any `/api/import*` prefix. Harmless (no sibling routes exist; identical behavior to `/api/health`), but be aware the allowlisting is prefix-based, not exact.

**Acceptance:** an unauthenticated (no-cookie) `POST /api/import` reaches the route handler — verified by getting a `401` (bad/no token) or `200` (valid token) JSON response, **not** a 307 redirect to `/login`.

### Step 5: Unit tests (route + service)

Two test files. **Route tests** cover auth/validation/wiring (service mocked); **service tests** cover the actual upsert logic (Supabase mocked). The service tests are non-optional: without them the dedup/existence-check/scoping logic — the riskiest code — has zero coverage, and the kind of defect found in this review (the `.in()` escaping bug) would ship green. They also match the repo's actual precedent ([generation.service.test.ts](../../src/lib/services/__tests__/generation.service.test.ts) tests a service function directly, not a route).

**Note (added 2026-05-27 review):** No route-handler unit test exists in this repo yet, but Node 22 provides global `Request`/`Response`/`Headers` (verified), so `NextResponse.json()` + `new Request()` should work under vitest/jsdom. Write the 401 route test **first** as a smoke check that `next/server` behaves; if it doesn't, fall back to leaning on the service tests + a thin auth-only route test.

**Note (added 2026-05-27 review pass 3):** the vitest environment is **jsdom**, not node ([vitest.config.ts:8](../../vitest.config.ts#L8)) — under jsdom the `Request`/`Response` globals are jsdom's partial implementations and commonly conflict with `next/server`. Put `// @vitest-environment node` as the **first line** of `route.test.ts` to run that file under Node (vitest honors per-file env overrides), matching where route handlers actually execute. This pre-empts the "smoke check fails on the environment, not a real bug" trap in the note above.

**Route tests** — `src/app/api/import/__tests__/route.test.ts`. Mock `@/lib/services/flashcards.service` (`importFlashcards`) and `@/utils/supabase/admin` (`createAdminClient`). Set `process.env.IMPORT_API_KEY` and `IMPORT_USER_ID` in `beforeEach` (route reads them at request time). Build requests with the global `Request` constructor.
1. **Happy path:** valid key + valid cards → 200, body equals the mocked `{inserted, updated}`, and `importFlashcards` was called with `(cards, IMPORT_USER_ID, …)`.
2. **Missing `Authorization` header:** → 401, `importFlashcards` not called.
3. **Wrong token:** → 401, service not called.
4. **Oversized `back` (>500):** → 400, service not called (whole-batch rejection).
5. **Body supplies `user_id`** at both the top level (sibling to `cards`) and inside a card object: still calls `importFlashcards` with `IMPORT_USER_ID`, never the body value (asserts both Zod strip sites).

**Service tests** — `src/lib/services/__tests__/flashcards.service.test.ts` (or extend an existing service test file). Mock a Supabase client whose `.eq().eq().limit().maybeSingle()` chain returns a configurable existing-row (or null) per front, and capture `.insert()` / `.update()` calls.

**Note (added 2026-05-27 review pass 3):** no existing test mocks a Supabase query-builder chain — `generation.service.test.ts` tests a *pure* function (`validateFlashcards`) and mocks no client. The chainable mock (each builder method returns the next link; terminal `.maybeSingle()` returns `{ data, error }`) must be built from scratch; budget for that scaffolding within the 1.5 hr. (The repo *does* have service-test precedent; it just lacks Supabase-mock precedent.)
6. **Insert + update partition:** one new front + one existing front → `{inserted:1, updated:1}`; insert carries `source:"manual"`, `generation_id:null`, FSRS defaults; update sets only `back`.
7. **Intra-batch dedup:** same front twice (last-wins) → one write, `console.warn` called.
8. **Scoping:** every query/insert is scoped to the passed `userId`.
9. **Quote-safe matching:** a front containing `"` whose existing row is mocked as present → classified as update, not insert (guards against `.in()` reintroduction).

**Acceptance:** `npm run test` passes; route tests assert status/body/invocation; service tests assert counts, field defaults, dedup warning, scoping, and quote-safe classification.

### Step 6: Env documentation + deploy steps

Update [.env.example](../../.env.example) with a commented section:
```
# Machine-auth import endpoint (POST /api/import) — server-side only
IMPORT_API_KEY=###            # random secret; generate with: openssl rand -hex 32
IMPORT_USER_ID=###            # UUID of the jacekpietrzak@me.com account
SUPABASE_SERVICE_ROLE_KEY=### # service-role key (already configured locally)
```

**Deploy steps (Production only):**
1. Generate the key: `openssl rand -hex 32`. This entropy is the actual security boundary — keep it secret, rotate by replacing the env var.
2. Find `IMPORT_USER_ID`: Supabase dashboard → Authentication → Users → the `jacekpietrzak@me.com` row → copy the UUID (or `select id from auth.users where email = 'jacekpietrzak@me.com';`).
3. In Vercel → Project → Settings → Environment Variables, add `IMPORT_API_KEY`, `IMPORT_USER_ID`, and `SUPABASE_SERVICE_ROLE_KEY` (if not already present) scoped to **Production**.
4. Redeploy so the new env vars take effect.
5. Smoke test: `curl -X POST https://10x-cards.jackpietrzak.com/api/import -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"cards":[{"front":"ping","back":"pong"}]}'` → expect `{"inserted":1,"updated":0}`; re-run → expect `{"inserted":0,"updated":1}`.
6. Point the external tool at the endpoint with the same key.

**Acceptance:** `.env.example` documents all three vars; deploy steps are runnable and the smoke test demonstrates insert-then-update idempotency.

## Pitfalls

- **The middleware will swallow this endpoint if it isn't allowlisted.** `/api/import` must be in `PUBLIC_API_PATHS` ([middleware.ts:14](../../src/middleware.ts#L14)) or every cookieless request 307-redirects to `/login` and the route handler never runs (step 4.1). Symptom: the external tool gets login-page HTML / a redirect instead of JSON, with no error logged in the handler (because it never executed).
- **Never use `.in("front", …)` for the existence check.** `supabase-js`'s `.in()` only quote-wraps values containing `[,()]` and does not escape an embedded `"` ([PostgrestFilterBuilder.js:152-164](../../node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js#L152)). A front with a double-quote would produce malformed PostgREST syntax, silently miss its existing row, and insert a duplicate — breaking idempotency. Quotes in fronts are common and already a tested scenario ([generation.service.test.ts:393](../../src/lib/services/__tests__/generation.service.test.ts#L393)). Use per-card `.eq("front", …)`, which percent-encodes the operand and is safe for arbitrary text. Upstream confirms this: the library's auto-quoting (PR #166) covers only commas/parens, not embedded quotes — [postgrest-js #164](https://github.com/supabase/postgrest-js/issues/164), and `.in()`/`.or()`/`.filter()` are documented as requiring manual escaping the library doesn't perform.
- **`timingSafeEqual` throws on unequal-length buffers.** Always hash to fixed-length digests first; never pass raw token buffers of differing length.
- **Service-role bypasses RLS.** A missing `.eq("user_id", …)` anywhere in `importFlashcards` = cross-user read/write. The table already holds other `user_id`s (dev `DEFAULT_USER_ID`, E2E/test users), so this is a live hazard, not hypothetical. Covered by test #5 and explicit scoping.
- **Intra-batch duplicate fronts** must be deduped before the manual upsert, or two rows with the same front get inserted (no DB constraint to stop it).
- **Front-as-key is intrinsic, not a bug.** Editing a card's *back* in the PKS updates in place; editing its *front* creates a new card and orphans the old one (the request carries no stable external ID). The PKS integration should account for this.
- **Don't log secrets.** Keep the token and full card contents out of error logs.

## Known risks

- **Service-role bypasses RLS — no database backstop (accepted, 2026-05-27 grounding).** Supabase frames RLS as defense-in-depth "because even server-side code can have bugs" ([RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security), [API keys docs](https://supabase.com/docs/guides/getting-started/api-keys)). This endpoint forgoes that layer by design — the spec mandates the service-role client, which *always* bypasses RLS — and relies entirely on app-level `.eq("user_id", IMPORT_USER_ID)` scoping. A scoping bug would have no DB-level safety net and could read/write other users' rows (the table holds dev/test/E2E `user_id`s). Mitigation: hard-scope every operation + the scoping and quote-safe service tests (step 5, tests 8–9). The defense-in-depth alternative — minting a user-scoped session/JWT for `IMPORT_USER_ID` so RLS still applies — was not chosen (more complex; spec specifies service-role). Accepted trade-off for a single-user tool with the compensating controls in place.
- **Brute-force on the static key.** Mitigated by ≥256-bit entropy + constant-time compare. No rate limiting (out of scope) — acceptable because guessing a 256-bit key is infeasible. If ever abused, add rate limiting or rotate the key.
- **Mid-batch DB failure → transient partial write.** Mitigated by idempotent retry (Decision 2); a re-POST reconciles.
- **Typo'd `IMPORT_USER_ID`** (UUID not in `auth.users`) → FK violation `23503` → generic 500. Surfaced via logs; not pre-validated (would need an existence query — over-engineering).
- **Preview deployments** expose `/api/import`. Mitigated by setting secrets in Production only → previews fail closed (401/500).

## Out of scope (v1)

- Decks, grouping, tags.
- Rate limiting.
- Multi-user key tables / per-key scoping.
- Any UI changes.
- DB-enforced `UNIQUE(user_id, front)` + native `ON CONFLICT` upsert (revisit only if this becomes multi-writer).
- True transactional all-or-nothing writes via Postgres RPC.
