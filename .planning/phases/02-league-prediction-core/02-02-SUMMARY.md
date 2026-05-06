---
phase: 02-league-prediction-core
plan: "02"
subsystem: ui
tags: [react, supabase, typescript, onboarding, league-creation, rpc, multi-league]

# Dependency graph
requires:
  - phase: 02-league-prediction-core/02-01
    provides: SessionContext with leagues[], setActiveLeague(), LeagueSummary interface, create_league + regenerate_invite_code mock routes

provides:
  - Onboarding.tsx extended with full create-league path (create-name → create-nickname → create-email → create-confirm)
  - create-confirm screen displaying server-generated 4-char invite code in tracking-[0.3em] style with share button
  - LeagueSwitcher.tsx — new component listing all user leagues from SessionContext, calls setActiveLeague on selection
  - TopBar.tsx updated to open LeagueSwitcher when user has >1 league
  - LeagueTab.tsx updated with admin-only Regenerate invite code button + confirmation dialog wired to regenerate_invite_code RPC
  - supabase/migrations/20260504000001_phase2_league.sql — UNIQUE constraint on leagues.invite_code + create_league + regenerate_invite_code RPCs

affects:
  - 02-03 (PredictTab builds on stable SessionContext; no further UI changes to Onboarding/TopBar expected)
  - All tabs that render TopBar (league switcher now active when leagues.length > 1)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "League creation: signInAnonymously → users insert → create_league RPC → setCreatedInviteCode → setStep('create-confirm') → fire-and-forget refreshSession"
    - "Pitfall 3 avoidance: invite code stored from RPC response BEFORE refreshSession() so confirmation screen renders without a loading race"
    - "LeagueSwitcher: overlay + pixel-border dropdown anchored at var(--topbar-height); closes on overlay click or league selection"
    - "Regenerate code: admin-only button in LeagueTab → confirmation dialog → RPC → queryClient.invalidateQueries to refresh invite code display"

key-files:
  created:
    - apps/web/src/components/LeagueSwitcher.tsx
    - supabase/migrations/20260504000001_phase2_league.sql
  modified:
    - apps/web/src/components/Onboarding.tsx
    - apps/web/src/components/TopBar.tsx
    - apps/web/src/components/tabs/LeagueTab.tsx

key-decisions:
  - "Create-confirm step fires refreshSession() as a side-effect in handleCreate then awaits it again in handleStartPredicting — safe double-call because loadSession() is idempotent"
  - "Invite code stored in React state from the RPC response; never client-generated (T-02-10 accepted)"
  - "TopBar only shows switcher chevron when leagues.length > 1 to avoid confusion for single-league users"
  - "useQueryClient() imported in LeagueTab to invalidate ['league', leagueId] cache after regenerate, ensuring invite code card refreshes without a page reload"

patterns-established:
  - "Pattern: RPC response stored to state before async side-effects (refreshSession) to prevent race between UI and session load"
  - "Pattern: Admin-only UI gated by isAdmin prop; backend enforcement remains in is_league_admin() RPC"

requirements-completed:
  - LEAGUE-01

# Metrics
duration: 15min
completed: "2026-05-06"
---

# Phase 02 Plan 02: League Creation Flow + LeagueSwitcher + TopBar + LeagueTab Summary

**End-to-end create-league flow in Onboarding (4 steps + confirmation screen with server-generated invite code), plus LeagueSwitcher dropdown in TopBar and admin regenerate-code button in LeagueTab**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-06T05:30:00Z
- **Completed:** 2026-05-06T05:45:38Z
- **Tasks:** 3 (Task 1 + Task 2 completed in prior session; Task 3 completed now)
- **Files modified:** 5 (4 TypeScript components + 1 SQL migration)

## Accomplishments

- Added "Create a league" fork at Onboarding step 1; four new steps (create-name → create-nickname → create-email → create-confirm) wired without touching the existing join path
- Confirmation screen displays the server-generated invite code in `text-[14px] tracking-[0.3em]` style (matching LeagueTab's invite code card) with a share button; "Start predicting" awaits `refreshSession()` then navigates to "/"
- Created LeagueSwitcher.tsx: overlay + pixel-border dropdown listing all leagues from `useSession().leagues[]`; calls `setActiveLeague` on selection; TopBar renders it when `leagues.length > 1`
- Added Regenerate invite code button to LeagueTab admin section with a confirmation dialog showing the current code; calls `regenerate_invite_code` RPC and invalidates the React Query `["league", leagueId]` cache on success
- Supabase migration written with idempotent UNIQUE constraint and two SECURITY DEFINER RPCs granted to `authenticated` role; applied to live DB by user

## Task Commits

Each task was committed atomically:

1. **Task 1: Write supabase migration** - `e7f0a1f` (feat)
2. **Task 1 fix: DO block for idempotent constraint** - `f7ef240` (fix)
3. **Task 3: Onboarding create path + LeagueSwitcher + TopBar + LeagueTab** - `da41cdc` (feat)

## Files Created/Modified

- `supabase/migrations/20260504000001_phase2_league.sql` - UNIQUE constraint on leagues.invite_code + create_league RPC + regenerate_invite_code RPC; both granted to authenticated role
- `apps/web/src/components/Onboarding.tsx` - Step type extended; create-name/create-nickname/create-email/create-confirm steps added; "Create a league" button on step 1; handleCreate calls create_league RPC
- `apps/web/src/components/LeagueSwitcher.tsx` - New component; overlay + dropdown; lists leagues[] from SessionContext; calls setActiveLeague on selection
- `apps/web/src/components/TopBar.tsx` - Imports LeagueSwitcher; useState for switcherOpen; shows tappable league name with ▾ when leagues.length > 1
- `apps/web/src/components/tabs/LeagueTab.tsx` - Adds useQueryClient; showRegenerateConfirm state; handleRegenerate function; "Regenerate invite code" button and confirmation dialog in admin section

## Decisions Made

- Invite code stored from RPC response before `refreshSession()` fires (Pitfall 3 avoidance) — confirmation screen renders immediately, session load happens in background
- `handleStartPredicting` awaits `refreshSession()` a second time before `navigate("/")` — safe because `loadSession()` is idempotent and ensures session is ready before routing to the main app
- TopBar reads `leagues` from `useSession()` internally (not from props) — keeps prop interface backward-compatible; `Index.tsx` passes `leagueName`/`nickname` without change

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all UI elements are wired to real state and RPCs. The "Rename league" button in LeagueTab remains a placeholder (no onClick handler) but this is pre-existing and out of scope for this plan.

## Threat Surface Scan

No new trust boundaries introduced beyond what the plan's threat model already covers. `create_league` and `regenerate_invite_code` RPC calls are gated by Supabase `authenticated` role and `is_league_admin()` respectively (T-02-06, T-02-07 mitigated in the migration).

## User Setup Required

Task 2 (schema push) was completed manually by the user via Supabase Dashboard SQL Editor before Task 3 executed.

## Next Phase Readiness

- Plan 02-03 (prediction countdown UX) can execute immediately — no dependencies on Onboarding or TopBar changes
- All existing 5 E2E auth tests continue to pass; TypeScript clean (`tsc --noEmit` exits 0)
- The 12 fixme stub tests remain as skipped targets; league-create.spec.ts stubs are ready to go non-fixme once a full E2E create-flow test is wired against the mock routes

---
*Phase: 02-league-prediction-core*
*Completed: 2026-05-06*
