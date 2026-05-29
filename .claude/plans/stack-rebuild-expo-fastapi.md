# Plan: stack rebuild — Expo Router (iOS + PWA + Android-later) + FastAPI backend + Next.js marketing

**Status:** Deferred — not current priority. Captured 2026-05-29 from brainstorm session.

**Trigger to revisit:** when (a) current Next.js app's UI/UX work is complete, (b) there's a concrete reason the PWA ceiling is hit (App Store demand, native hardware feature like camera-to-card, real iOS distribution need), or (c) ready to invest 4–8 weeks of focused learning time.

---

## Final architectural decision (from brainstorm)

**Path 2 — split architecture, three deployments:**

| Surface | Stack | Role |
| --- | --- | --- |
| `10x-cards.com` (root) | Next.js 16+ | Marketing site — SSR for SEO. Landing page, pricing, blog, public docs. |
| `app.10x-cards.com` (web) + iOS app + Android-later | Expo Router (React Native + web target) | The actual flashcard app. One codebase → iOS native, Android native (when ready), PWA via Expo's web target. |
| `api.10x-cards.com` | FastAPI (Python) | Backend: Supabase access, OpenRouter integration, FSRS calculations, scheduled push for due-card reminders. |

**Why this combination:**
- **Path 2 over Path 1** — chosen because public landing page SEO matters; Expo's static export for marketing is "adequate," but a real Next.js marketing site is properly indexed and lets the marketing site evolve independently of app schema.
- **Expo Router over staying Next.js** — App Store presence requires a native target; Expo gives iOS + Android + PWA from one codebase. NativeWind 4 ports current Tailwind 4 styles 1:1.
- **FastAPI over keeping Next.js API routes** — Python AI ecosystem (instructor, LangChain, embedding libs, evaluation tools) is years ahead of Node equivalents. Pydantic v2 → TypeScript codegen via OpenAPI gives end-to-end types. Strong long-term skill investment if AI/ML matters.

## Drivers (from clarifying questions)

- Offline study on iPhone (subway, plane, gym)
- App Store presence — discoverability + credibility
- Learning the modern cross-platform stack (portfolio + future-proof skills)
- Both shipping and learning, roughly equal priority
- Android: not now, but don't paint into a corner — Expo solves this
- Public web presence with SEO matters → Path 2 (split) over Path 1 (pure Expo with static export)

## What changes vs. what stays

**Stays (port 1:1):**
- Supabase schema (`flashcards`, `generations`, `generation_error_logs`) — already RLS-correct
- Zod schemas → migrate to Pydantic v2 on backend; keep Zod on the Expo client (or codegen from FastAPI OpenAPI)
- FSRS algorithm logic — `ts-fsrs` is the JS port; Python equivalent is `py-fsrs` or implement directly (it's small)
- Domain types (DTOs, commands) — auto-generated from FastAPI OpenAPI schema on the Expo side

**Rewrites:**
- All React components → Expo Router screens with NativeWind 4
- Next.js API routes → FastAPI endpoints
- Auth flow → from cookie-based Supabase to PKCE / deep-link flow on native
- Marketing pages → fresh Next.js project, much smaller surface than current app

## Migration shape (high-level, not the detailed plan)

1. **Decide deployment targets first** — Fly.io vs. Railway vs. Render for FastAPI; Vercel stays for Next.js marketing; EAS for Expo iOS/Android builds.
2. **Stand up FastAPI skeleton** with one endpoint (e.g. `/api/flashcards/list`) and Supabase JWT verification. Smoke test against existing DB. **This validates the whole architecture before any UI rewrite.**
3. **Set up Expo Router project** alongside existing repo (monorepo recommended — pnpm workspaces or Turborepo).
4. **Port shared, non-UI logic** to the Expo client and FastAPI backend in parallel: types, validation schemas, services.
5. **Re-implement screens** in Expo Router, NativeWind for styling, calling FastAPI endpoints.
6. **Auth** — deep-link PKCE flow via `@supabase/supabase-js` native helpers.
7. **Offline sync layer for FSRS** — see "hard problem" below.
8. **PWA configuration** for Expo's web target — manifest, service worker.
9. **iOS build via EAS + TestFlight** — first App Store submission, AI-content disclosure.
10. **Stand up Next.js marketing site** as a separate Vercel deploy at root domain. App moves to `app.10x-cards.com`.
11. **Cutover** — sunset old Next.js full-app deploy once Expo web + marketing are live.

**Rough budget:** 4–8 weeks focused solo work in tutor mode. Realistically the long pole is step 7.

## The hard problem hiding in this migration

**Offline FSRS sync conflict resolution.** This is a product / data-model problem, not a stack problem — and it needs to be designed *before* writing migration code, not during it.

**The conflict:** if a user reviews 50 cards offline on iPhone and 30 on web simultaneously, both have stale `due` / `stability` / `state` for the same card. When they reconnect, which review wins?

**Possible policies (decide which during plan-interview):**
- **Last-write-wins by timestamp** — simplest, loses some reviews. Probably fine.
- **Per-device review log replayed server-side** — backend re-derives FSRS state from the full ordered log. Most correct, most complex.
- **Conflict-prompt UI** — show user the conflict, let them choose. Cleanest UX, worst engineering ergonomics.

**Recommendation when revisiting:** start with last-write-wins, design the schema to support log-replay later (store every review event as an append-only row, not just the resulting state).

## Pre-conditions before starting this migration

These should all be true before opening this plan:

- [ ] Current Next.js app's UI/UX is at a quality level you're satisfied with (no point rewriting screens that are still being designed)
- [ ] React 19 + Next 16 upgrade is done in the current app (port reference is stable)
- [ ] FSRS sync conflict policy is decided (see above)
- [ ] Deployment targets for FastAPI are chosen (Fly.io / Railway / Render / other)
- [ ] OpenRouter cost projections accommodate Python SDK call patterns (mostly the same, but check)
- [ ] Comfortable enough with FastAPI + Pydantic v2 from a tutorial / small side project to not be learning syntax during migration
- [ ] Apple Developer Program account ready ($99/yr) and content moderation story for AI-generated content drafted

## Open questions to settle in `/plan-interview` when revisiting

1. Monorepo (Turborepo / pnpm workspaces) vs. three separate repos? Monorepo recommended for shared types.
2. Backend deployment target — Fly.io vs. Railway vs. Render vs. AWS App Runner. Fly.io is the strongest fit for FastAPI; Railway has best DX; Render is middle ground.
3. Type-sharing strategy — OpenAPI codegen from FastAPI to Expo client (via `openapi-typescript` or `orval`), or hand-maintained types in a shared package?
4. Auth on web target — does the Expo web build keep cookie-based Supabase auth (different from native PKCE) or unify on PKCE everywhere?
5. Push notification backend — Supabase scheduled functions vs. FastAPI cron worker vs. APNs/FCM directly from FastAPI?
6. Database access from FastAPI — Supabase Python client vs. direct Postgres via SQLModel/SQLAlchemy with RLS-aware queries?

## What this plan is NOT

- Not a detailed step-by-step implementation plan (that's `/plan-interview` work when ready)
- Not a commitment to this stack — re-evaluate if priorities shift (e.g., if user count grows and the current Next.js PWA upgrade ends up being enough)
- Not a decision about *when* — explicitly deferred until current-stack work is satisfying

## Related work that's higher priority right now

See separate plan(s) for current-Next.js-stack UI/UX + learning improvements. Capture those before committing to this rebuild.
