# Plan: Full-CRUD extension of POST /api/import

## Overview

Extend the machine-auth import endpoint (`POST /api/import`, shipped 2026-05-27) from upsert-only to full CRUD, so the external life-os caller — the sole writer of `source='manual'` cards — can push a minimal diff (adds/updates, renames, deletes) in a single request and never needs manual cleanup in the app UI.

Two new optional request fields join the existing `cards` array: `delete_fronts` (delete by front) and `patches` (rename in place, preserving the row id and all FSRS state). `cards` becomes optional; at least one of the three arrays must be non-empty. The response grows from `{ inserted, updated }` to `{ inserted, updated, deleted, patched, skipped_patches }` — a strict superset, so existing callers keep working unchanged.

The hard safety invariant: **delete and patch only ever touch `source='manual'` rows**, enforced server-side in every query (`.eq("source", "manual")` alongside `.eq("user_id", importUserId)`). AI-generated cards (`ai-full`, `ai-edited`) are unreachable through the new operations. The existing upsert path keeps its current (source-agnostic) behavior for backward compatibility.

Everything else stays: same URL, same bearer auth (`IMPORT_API_KEY`, SHA-256 + `timingSafeEqual`), same service-role client scoped to `IMPORT_USER_ID`, same middleware allowlist entry, same 1–100 per-array caps. No schema/migration changes — the work is Zod schema + service layer + route + tests + smoke script.

Out of scope: rate limiting beyond existing caps, UI changes, multi-user key tables, exposing card IDs (life-os matches by front).

## Architectural decisions

### Decision 1 (RESOLVED 2026-07-19): Rename conflict → skip that patch, report per-patch outcome

**Choice:** If a patch's `new_front` already exists as another row for this user, skip that patch and report it in `skipped_patches: [{ old_front, reason: "new_front_conflict" }]`. `patched` counts only successful patches.

**Rationale:** User's stated lean. Merging (delete the colliding row) would silently destroy FSRS state; erroring the whole request would make one stale diff entry block unrelated operations. The conflict check is user-wide across all sources, because `(user_id, front)` is the dedup key for the whole import pipeline regardless of source — renaming onto an AI card's front would create a duplicate-front pair that breaks upsert semantics. A patch where `old_front === new_front` (back-only patch) must exclude the row's own id from the conflict check.

**Trade-offs:** Caller must inspect `skipped_patches` to notice a rename didn't land. Acceptable — the caller is a diff script that can log/retry.

### Decision 2 (RESOLVED 2026-07-19): Missing `old_front` → skip, report with reason

**Choice:** If `old_front` matches no `source='manual'` row, skip the patch. `patched` reflects only successful patches (user's lean). Refinement over "skip silently": the skip is also reported in `skipped_patches` with `reason: "old_front_not_found"` — it costs nothing, keeps the response contract intact (extra detail inside an already-extra field), and makes diff-drift on the caller side debuggable instead of invisible.

**Rationale:** Idempotency — re-sending the same diff after a partial failure converges without errors.

### Decision 3 (RESOLVED 2026-07-19): Best-effort sequential phases, no transaction

**Choice:** Process in deterministic order **deletes → patches → cards upsert**, best-effort. No DB transaction. A DB error mid-request → 500 with possible partial writes.

**Rationale:** supabase-js/PostgREST offers no multi-statement transactions; atomicity would require a Postgres function (RPC) — a migration plus a second code path diverging from every existing service pattern in `flashcards.service.ts`. Blast radius is inherently small: ≤300 rows, one user, delete/patch hard-scoped to `source='manual'`. Crucially, **every operation is idempotent** (delete of absent row is a no-op, patch of absent `old_front` skips, upsert converges), so the caller's recovery from a 500 is "re-send the same diff" — which is what the life-os script does naturally on the next push. Idempotency + retry beats transactional atomicity here at a fraction of the complexity.

**Trade-offs:** A mid-request failure leaves the DB between states until the retry. Accepted given single-writer, single-user, retry-safe semantics.

### Decision 4 (RESOLVED 2026-07-19): Caps unchanged; cross-array overlap is a 400

**Choice:** Each array is optional with max 100 entries (min removed per-array; a request-level Zod `superRefine` requires at least one non-empty array → 400 otherwise). No rate limiting added. Two cheap ambiguity guards, both 400: `delete_fronts` must be disjoint from `cards[].front`, and disjoint from `patches[].old_front` — a front that is both deleted and upserted/patched in one request is a caller bug whose outcome would otherwise depend silently on processing order.

**Trade-offs:** None meaningful; the life-os diff computation can never legitimately produce those overlaps.

## Design decisions

### Response shape (RESOLVED 2026-07-19)

```json
{ "inserted": 0, "updated": 0, "deleted": 0, "patched": 0, "skipped_patches": [] }
```

All five fields always present (`skipped_patches` is `[]` when empty). The four counters satisfy the life-os contract; `skipped_patches` is the permitted extra field. A cards-only legacy request gets `deleted: 0, patched: 0, skipped_patches: []` — additive, non-breaking.

### Query mechanics (RESOLVED 2026-07-19)

- **Quote-safety:** fronts may contain quotes/commas — the existing service explicitly forbids `.in("front", …)` (see comment at [flashcards.service.ts:403](src/lib/services/flashcards.service.ts#L403)). Deletes therefore run **per-front** `.delete().eq("user_id", …).eq("source", "manual").eq("front", front).select("id")`, parallelized with `Promise.all`, summing returned rows for the exact `deleted` count. Do NOT use a single `IN`-list delete.
- **Patches run sequentially** (each: lookup `old_front` + conflict-check `new_front`, both scoped `.eq()` and terminated `.limit(1).maybeSingle()`, then `UPDATE front, back WHERE id AND user_id AND source='manual'`). **Note (added 2026-07-19 review):** `.limit(1)` is mandatory, not stylistic — there is **no unique constraint on `(user_id, front)`** ([flashcards migration](supabase/migrations/20240628123001_create_flashcards_table.sql) creates only `user_id`/`generation_id` indexes), so bare `.maybeSingle()` throws PGRST116 when duplicate fronts exist (e.g. a manual and an AI card sharing a front). The existing upsert lookup at [flashcards.service.ts:412](src/lib/services/flashcards.service.ts#L412) uses `.limit(1).maybeSingle()` for exactly this reason. Sequential because patches can chain (A→B while B→C) and two patches can target the same `new_front`; parallel execution would race the conflict checks. `updated_at` refreshes via the existing DB trigger — do not set it manually (the existing update path at [flashcards.service.ts:470](src/lib/services/flashcards.service.ts#L470) relies on the same trigger).
- **Intra-batch dedup**, mirroring the existing upsert dedup: `delete_fronts` via `Set`; `patches` deduped by `old_front`, last occurrence wins (log a `console.warn` on collapse, matching [flashcards.service.ts:396](src/lib/services/flashcards.service.ts#L396)).
- **Timeout headroom:** worst-case 100 sequential patches ≈ 200+ DB round trips. Add `export const maxDuration = 60;` to the route next to the existing `export const runtime = "nodejs";`. Realistic diffs are a handful of ops, but the cap must not 504.

### Service layer shape (RESOLVED 2026-07-19)

`importFlashcards` stays untouched (it is the upsert phase). Add to `src/lib/services/flashcards.service.ts`:

- `deleteManualFlashcards(fronts, userId, supabase) → { deleted }`
- `patchManualFlashcards(patches, userId, supabase) → { patched, skipped_patches }`
- `processImportRequest(payload, userId, supabase)` — orchestrator running delete → patch → upsert phases and assembling the five-field response. The route calls only this.

## Implementation order

| Step | Title | Scope | Effort | Schema change? | Depends on | Status |
|---|---|---|---|---|---|---|
| 1 | Zod schema extension + types | schemas | 1 h | No | — | Shipped |
| 2 | Service layer: delete, patch, orchestrator | services | 2 h | No | 1 | Pending |
| 3 | Route handler wiring + maxDuration | API | 1 h | No | 2 | Pending |
| 4 | Unit tests (route + service) | tests | 2 h | No | 3 | Pending |
| 5 | Smoke test extension + docs | scripts/docs | 1 h | No | 3 | Pending |

## Progress log

**2026-07-19 — Plan created.** Plan drafted via `/plan-interview` (interview conducted asynchronously from the user's written brief; all four open decisions resolved per the user's stated leans, see Architectural decisions). Ready for `/plan-review` before implementation begins. **Up next:** step 1.

**2026-07-19 — /plan-review pass 1 (verdict: GO).** Codebase-verified review found two plan-text defects, both folded inline: (1) CRITICAL — patch lookups must be `.limit(1).maybeSingle()` because `(user_id, front)` has no unique constraint (folded into Design decisions and Step 2); (2) WARNING — Step 3's route rewire would break the existing route tests and block CI, so substep 3.1 now adapts the `vi.mock` wiring within Step 3. Also added Pitfalls entries: concrete mock-extension shapes, duplicate-front asymmetry (accepted behavior), `maxDuration` tier caveat. Verified clean: `updated_at` trigger exists, `source` check constraint matches, middleware needs no change, supabase-js `^2.49.4` and Zod `^3.25.64` support all used APIs. **Up next:** step 1.

**2026-07-19 — Domain sweep + /plan-review pass 2 (verdict: GO).** Post-review sweep of the wider flashcards domain (app-side CRUD, schemas, types) plus live prod data check (23 cards, 16 manual, 3 users, zero duplicate fronts today — the `.limit(1)` guard remains future-proofing). Added the second-writer-drift pitfall. Pass 2 (delta) verified test tooling (`npm test` → vitest, config present), the real CI gate in `.github/workflows/master.yml` (unit-test blocks build blocks deploy), and the smoke script tail; folded two one-line notes: Zod `.max(100).optional()` chain order (Step 1) and response key-order pinning for smoke-script compatibility (Step 2). Contract unchanged. Plan ready for implementation. **Up next:** step 1.

**2026-07-19 — /plan-review pass 3, final (verdict: GO, plan frozen).** Audited the last blind spots: (1) trim asymmetry — UI create/update schemas don't trim fronts while import does; prod queried, zero untrimmed manual fronts exist; folded as a sub-case of the second-writer pitfall; (2) Step 4 acceptance wording adjusted to acknowledge substep 3.1's test adaptation; (3) plan file structural integrity verified (table, Up-next pointers, H3/table title alignment, dated fold markers). Three passes converged — pass 1 found the only substantive defects, passes 2–3 only precision notes. Review cycle closed; endpoint contract stable across all passes. Implementation may begin. **Up next:** step 1.

**2026-07-19 — Step 1 shipped.** Extended [src/lib/schemas/import.ts](src/lib/schemas/import.ts) with `importPatchSchema` + `ImportPatch`, reworked `importRequestSchema` (three optional arrays, `.max(100).optional()` chain order, superRefine: at-least-one-non-empty + both delete-disjointness guards, post-trim comparison). Divergence from plan: a transitional shim in [src/app/api/import/route.ts](src/app/api/import/route.ts) (`result.data.cards ?? []`) keeps the build/CI green — see the dated note under Step 1; delete/patch-only requests are 200 no-ops until Step 3, so the life-os caller must not be updated before Steps 2–3 deploy. Verified: 72/72 tests, 14/14 schema parse checks, lint clean, prod build passes. /plan-review delta pass: GO. **Up next:** step 2.

## Step details

### Step 1: Zod schema extension + types

In [src/lib/schemas/import.ts](src/lib/schemas/import.ts):

- Add `importPatchSchema`: `old_front` (trim, min 1, max 200 — same rules as `importCardSchema.front`), `new_front` (same rules), `new_back` (trim, max 500 — same rules as `importCardSchema.back`). All three required. Follow the existing doc-comment style explaining why `.trim()` precedes length checks and why non-strict objects strip smuggled keys.
- Rework `importRequestSchema`: `cards`, `delete_fronts` (array of trimmed min-1 max-200 strings), and `patches` all optional with a 100-entry cap (drop per-array `.min(1)`). **Note (added 2026-07-19 review pass 2):** chain order matters — `z.array(x).max(100).optional()`, since `ZodOptional` has no `.max()`. Then `.superRefine` enforcing: (a) at least one of the three arrays is non-empty, message "At least one of cards, delete_fronts, or patches must be non-empty"; (b) `delete_fronts` disjoint from `cards[].front`; (c) `delete_fronts` disjoint from `patches[].old_front`. Compare fronts **after** trim (Zod transforms run before refine, so refine sees trimmed values).
- Export `ImportPatch` and the updated `ImportRequest` types.

Acceptance: `npm run lint` clean; existing `{ cards: [...] }` payloads still parse; `{}` and `{ cards: [] }` fail; `{ delete_fronts: ["x"] }` alone parses; overlap payloads fail with the refine messages.

**Note (added 2026-07-19 review, post-implementation):** Step 1 also required a one-line transitional shim in the route — `importFlashcards(result.data.cards ?? [], …)` — because `cards` becoming optional otherwise breaks `npm run build` (and CI blocks the per-step commit). Verified safe: `importFlashcards([])` is a true no-op. Consequence for the Steps 1→3 window: a delete/patch-only request is a **200 no-op** returning `{ inserted: 0, updated: 0 }` — do **not** update the life-os caller to send `delete_fronts`/`patches` until Steps 2–3 are deployed. Step 3 replaces the shimmed call.

### Step 2: Service layer — delete, patch, orchestrator

In [src/lib/services/flashcards.service.ts](src/lib/services/flashcards.service.ts), following the file's existing patterns (guard clauses, per-front `.eq()` never `.in()`, `console.warn` on intra-batch collapse, error logging without card content):

- `deleteManualFlashcards(fronts: string[], userId, supabase)`: dedupe via `Set`; `Promise.all` of per-front `.delete().eq("user_id", userId).eq("source", "manual").eq("front", front).select("id")`; sum returned row counts → `{ deleted }`. Throw on any Supabase error (route's catch → 500).
- `patchManualFlashcards(patches: ImportPatch[], userId, supabase)`: dedupe by `old_front` last-wins with warn; then **sequentially** per patch:
  1. Lookup: `select id` where `user_id`, `source='manual'`, `front=old_front`, `.limit(1).maybeSingle()`. No row → push `{ old_front, reason: "old_front_not_found" }` to skipped, continue.
  2. Conflict check (skip when `old_front === new_front`): `select id` where `user_id`, `front=new_front`, `.neq("id", foundId)`, `.limit(1).maybeSingle()`. Row exists (any source) → push `{ old_front, reason: "new_front_conflict" }`, continue.
  3. Update: `.update({ front: new_front, back: new_back }).eq("id", foundId).eq("user_id", userId).eq("source", "manual")`. Do not set `updated_at` (DB trigger). Increment `patched`.
  Return `{ patched, skipped_patches }`.
- `processImportRequest(payload: ImportRequest, userId, supabase)`: run phases in order — delete (if `delete_fronts?.length`), patch (if `patches?.length`), upsert via existing `importFlashcards` (if `cards?.length`). Missing phases contribute zero counts. Return `{ inserted, updated, deleted, patched, skipped_patches }` with all five fields always present. **Note (added 2026-07-19 review pass 2):** keep `inserted` and `updated` first and adjacent in the return literal — the pre-Step-5 smoke script greps for the exact substring `"inserted":N,"updated":M` ([import-smoke-test.sh:70-79](scripts/import-smoke-test.sh#L70-L79)), and `NextResponse.json` preserves literal key order, so this ordering keeps the old script green during the Steps 3–5 window.

Acceptance: `npm run lint` clean; `importFlashcards` unmodified; every delete/patch query carries both `.eq("user_id", …)` and `.eq("source", "manual")`.

### Step 3: Route handler wiring + maxDuration

In [src/app/api/import/route.ts](src/app/api/import/route.ts):

- Add `export const maxDuration = 60;` beside `export const runtime = "nodejs";` with a one-line comment (sequential patch phase can be slow at the 100-cap).
- Replace the `importFlashcards(result.data.cards, …)` call with `processImportRequest(result.data, importUserId, supabase)`.
- Auth, config check, JSON parse, Zod parse, and error handling stay byte-identical. Update the route's doc comment: new request fields, five-field response, processing order, `source='manual'` safety invariant, error codes (401 auth; 400 malformed JSON / Zod incl. all-empty and overlap; 500 misconfig or DB error — partial writes possible, retry-safe).
- **3.1 (added 2026-07-19 review): keep the existing route tests green in this step.** [route.test.ts:6-8](src/app/api/import/__tests__/route.test.ts#L6-L8) mocks `importFlashcards` and asserts the route calls it; after the rewire, the unmocked real `processImportRequest` would run against the `{}` fake admin client and crash every existing route test — and CI (Lint → Unit Tests → Build → Deploy) blocks the deploy on red tests. In this step, update the `vi.mock` factory to stub `processImportRequest`, set its `mockResolvedValue` to the five-field shape, and adjust existing assertions to the new call target. The *new* coverage matrix stays in Step 4.

Acceptance: `npm run build` passes; `npm test` green (existing suite adapted, no new cases yet); a cards-only request returns the five-field response with zeros for the new counters.

### Step 4: Unit tests (route + service)

Extend [route.test.ts](src/app/api/import/__tests__/route.test.ts) (mocking the orchestrator, following the existing vi.mock pattern) and [flashcards.service.test.ts](src/lib/services/__tests__/flashcards.service.test.ts) (chainable Supabase mock). Minimum matrix (from the brief):

1. Happy path per op: cards-only, delete-only, patches-only, and combined request → correct counts and 200.
2. **Delete safety:** an `ai-full` row with a front listed in `delete_fronts` is not deleted — assert the query builder received `.eq("source", "manual")`.
3. **Patch safety:** same assertion for the patch lookup and update.
4. Rename conflict → patch skipped, `skipped_patches` carries `new_front_conflict`, `patched` excludes it.
5. Missing `old_front` → skipped with `old_front_not_found`.
6. Backward compat: legacy `{ cards: [...] }` body → 200 with `deleted: 0, patched: 0, skipped_patches: []`.
7. Validation 400s: all-empty request; `delete_fronts` ∩ `cards` overlap; array >100.
8. Back-only patch (`old_front === new_front`) succeeds — conflict check must not self-collide.

Acceptance: `npm test` (vitest) green; pre-existing tests (as adapted by substep 3.1) still passing.

### Step 5: Smoke test extension + docs

- Extend [scripts/import-smoke-test.sh](scripts/import-smoke-test.sh): after the existing upsert checks, patch one smoke row (assert `patched: 1`), attempt a conflicting rename (assert `skipped_patches` non-empty), then delete all smoke rows via `delete_fronts` (assert `deleted` count). Bonus: the script now **cleans up after itself** — update its header comment, which currently instructs manual UI cleanup.
- Docs: update `DEPLOYMENT.md`'s `/api/import` section and the endpoint contract wherever it's documented; no CLAUDE.md env changes (no new env vars).

Acceptance: script exits 0 against a local/dev environment; leaves zero residual rows.

## Pitfalls

- **`.in("front", …)` is forbidden** for quote-safety — the existing service comment is explicit. Per-front `.eq()` only, for deletes and patch lookups alike.
- **The existing upsert path is source-agnostic** (its lookup has no `source` filter), so `cards` can update an AI card's back if fronts collide. That is pre-existing, contractually relied-upon behavior — do not "fix" it in this plan; the `source='manual'` invariant applies to delete and patch only.
- **Second-writer drift (added 2026-07-19 review):** the app UI can still edit/delete manual cards by id via `updateFlashcard`/`deleteFlashcard` ([flashcards.service.ts:191](src/lib/services/flashcards.service.ts#L191), [:254](src/lib/services/flashcards.service.ts#L254)) and `/api/flashcards/[id]`. If the user renames a manual card's front in the UI, the life-os diff (which matches by front) will re-insert the old front on the next push and orphan the renamed row. Accepted: the whole point of this plan is that life-os becomes the sole writer for manual cards, so UI edits to them stop happening. No code change — just don't weaken this assumption during implementation. **Trim sub-case (added 2026-07-19 review pass 3):** the UI create/update schemas do not `.trim()` fronts ([api/flashcards/route.ts:28](src/app/api/flashcards/route.ts#L28), [flashcards.ts:30](src/lib/schemas/flashcards.ts#L30)) while import trims everything — a UI-saved front with stray whitespace is byte-unreachable by import matching. Prod verified: zero untrimmed manual fronts today. Latent only; covered by the sole-writer assumption.
- **`timingSafeEqual`/auth block must not be touched** — any refactor there risks the fail-closed property covered by the existing tests.
- **Vitest mock shape (sharpened 2026-07-19 review):** the service tests' builder mock ([flashcards.service.test.ts:34-41](src/lib/services/__tests__/flashcards.service.test.ts#L34-L41)) supports exactly three terminal shapes (lookup / insert / update). The new code needs: (a) `.delete().eq()×3.select("id")` awaited → `{ data: rows, error }` — the thenable currently returns only `{ error }` and captures no deletes; (b) a `.neq()` chain method on the conflict-check lookup. The one-op-per-builder design extends cleanly; add a `deletes` capture array alongside `updates`.
- **Duplicate fronts behave asymmetrically (added 2026-07-19 review):** with no unique constraint, per-front delete removes **all** matching manual rows (correct count via returned rows), while patch updates only the single row `limit(1)` found. This asymmetry is accepted for the single-writer manual namespace — document it in the service doc comments; do not turn it into an error.
- **`maxDuration = 60` (added 2026-07-19 review):** supported on Vercel Hobby with fluid compute and on Pro; plan tier not verifiable from the repo — if the deploy rejects it, drop to the tier maximum rather than removing the export.

## Out of scope (v1)

- Rate limiting beyond the 100-per-array caps.
- UI changes.
- Multi-user API-key tables (still single-user via `IMPORT_USER_ID`).
- Card ID exposure in the API (life-os matches by front).
- Transactional atomicity via Postgres RPC (revisit only if partial-write 500s are observed in practice).
