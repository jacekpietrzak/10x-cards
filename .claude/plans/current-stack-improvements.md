# Plan: current Next.js stack improvements

**Status:** Active. Started 2026-05-29.

**Context:** Expo / FastAPI rebuild is deferred (see [stack-rebuild-expo-fastapi.md](./stack-rebuild-expo-fastapi.md)). Goal of this plan is to extract maximum learning + UI/UX value from the current stack while it's the production system.

**Mode:** Tutor — each phase should teach a piece of the modern React/Next ecosystem. Skills here transfer to the eventual Expo migration; none of the work is wasted.

---

## Phases

### Phase 1 — Stack upgrade: React 18 → 19, Next 15 → 16
**Status:** NEXT.

**Why first:** Everything below builds on this. Polishing UI on a foundation about to change is wasted motion. React 19 introduces `useOptimistic` / Actions / ref-as-prop, which directly improve Phase 2's review-flow polish.

**What to learn:**
- Async `params` / `searchParams` (Next 15+ breaking change)
- New caching defaults in Next 15+ (no more aggressive fetch caching by default)
- React 19 ref-as-prop (no more `forwardRef` for new code)
- React 19 Actions + `useActionState` / `useFormStatus`
- `useOptimistic` for instant UI feedback
- Whatever Next 16 brings (TBD when we start)

**Out of scope for Phase 1:** Tailwind 4 is already on, ESLint 9 is current, Vitest 3 is current. The lag is specifically React + Next.

**Branching:** dedicated branch, not on `main`. Likely shipped as one or two PRs depending on diff size.

**Pre-conditions before starting:**
- [ ] Audit current codebase for usages that will break (async params, `forwardRef` in custom components, fetch caching assumptions)
- [ ] Confirm Supabase SSR helpers are React 19-compatible
- [ ] Confirm shadcn/ui components are React 19-compatible (most are already)
- [ ] Confirm `react-hook-form`, `next-themes`, `sonner` all work on React 19

---

### Phase 2 — UI/UX polish on the FSRS review flow
**Status:** After Phase 1.

**Why:** This is the core product experience. A flashcard app's value is concentrated in the review loop. Phase 1 unlocks the right tools for it.

**Scope (tentative — refine in `/plan-interview` when we get here):**
- `useOptimistic` for review rating actions (card disappears instantly, syncs in background — feels native)
- Card flip / answer-reveal animation (motion or framer-motion)
- Keyboard shortcuts: `1` / `2` / `3` / `4` for FSRS ratings (Again / Hard / Good / Easy), `space` to flip
- Better empty states (no cards due, all caught up, no flashcards yet)
- Loading skeletons replacing spinners
- FSRS retention curve / upcoming review heatmap on dashboard (educational visualization)
- Polished error states for generation failures (currently logged to DB; surface to user better)

**What to learn:** `useOptimistic`, `useTransition`, motion libraries, when to colocate state vs. lift it, accessibility for animated content (respect `prefers-reduced-motion`).

---

### Phase 3 — PWA layer
**Status:** After Phase 2.

**Why:** Partial credit toward the long-term iPhone goal *today*, on the current stack. Teaches service worker mechanics — skills that transfer directly to Expo's web target later. Also: validates whether the PWA ceiling is actually as low as claimed in the brainstorm; useful data for the deferred Expo decision.

**Scope (tentative):**
- `manifest.json` with proper icons (multiple sizes), theme color, display mode
- Service worker for offline shell + offline flashcard review (Workbox or hand-rolled with Next 16 helpers)
- Background sync for queued FSRS reviews (`Background Sync API` with fallback to next page load)
- Web push for "X cards due" notifications (iOS 16.4+ supports this)
- "Add to Home Screen" prompt UX (don't be obnoxious — show after positive engagement)

**Hard problem to solve here:** offline FSRS sync conflict resolution. Same problem as flagged in the rebuild plan. If we solve it here, the Expo migration inherits the solution.

**What to learn:** Service worker lifecycle, cache strategies (stale-while-revalidate, cache-first), Web Push API, `prompt-for-install` UX patterns, IndexedDB for offline queue.

---

### Phase 4 — Tests + accessibility audit (runs in parallel with 2 and 3)
**Status:** Concurrent with Phase 2 / 3, not blocked by them.

**Why parallel, not after:** tests are best learned by writing them for code you're *actively* changing. As we touch each area in Phase 2 / 3, write tests for that area. Accessibility audit is similarly: easier to fix as we polish components than to revisit later.

**Scope:**
- Vitest unit tests for service layer (`flashcards.service.ts`, `generation.service.ts`, `openrouter.service.ts`)
- Playwright smoke tests for: auth flow, generation flow, review flow
- ARIA audit: landmarks, focus management, keyboard-only nav, `prefers-reduced-motion`
- Screen reader pass on review flow (the highest-value flow)

**What to learn:** vitest patterns for service-layer testing, mocking strategies (real Supabase vs. mocked), Playwright fixtures, ARIA best practices, screen-reader testing methodology.

---

## Sequencing rationale

```
Phase 1 (stack upgrade) ───┐
                           ├─► Phase 2 (UI/UX) ──┐
                           └─► Phase 3 (PWA) ────┤
                                                 ├─► (later: revisit Expo rebuild decision)
                           Phase 4 (tests + a11y) running throughout 2 & 3
```

Phase 1 is the only true bottleneck. Phases 2 and 3 could run in either order or concurrently — leaning 2 → 3 because UI polish has more immediate visible reward and PWA's hard problem (offline sync) benefits from a stable UI to integrate against.

## What this plan is NOT

- Not a commitment to *not* eventually doing the Expo rebuild — the deferred plan is still alive
- Not a feature roadmap — no new features, this is quality work on existing surface
- Not a sprint plan with dates — pace is set by tutor-mode learning, not delivery deadline
- Not a substitute for `/plan-interview` per-phase — each phase should be planned in detail when it starts

## Next concrete action

Take Phase 1 into `/plan-interview` to produce a detailed, step-by-step migration plan for React 19 + Next 16 in *this* codebase, after auditing what specifically breaks.
