---
phase: 02-league-prediction-core
plan: "01"
subsystem: auth
tags: [react, supabase, context, typescript, playwright, session, multi-league]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: SessionContext single-league shape, Join.tsx deep-link handler, Playwright mock-routes fixture

provides:
  - SessionContext with leagues[] array, setActiveLeague(), and localStorage persistence of activeLeagueId
  - LeagueSummary interface exported from SessionContext.tsx
  - Join.tsx authenticated-join confirmation UI ("Add this league?")
  - mock-routes.ts extended with create_league, regenerate_invite_code, leagues REST, and league_members array mocks
  - Wave 0 stub spec files: league-create.spec.ts, multi-league.spec.ts, predict-countdown.spec.ts

affects:
  - 02-02 (league creation flow uses SessionContext.leagues[] and refreshSession())
  - 02-03 (countdown UX builds on PredictTab which reads session from refactored context)
  - All tabs that consume useSession() — session.leagueId/leagueName/role still resolve from active league

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-tenancy: active-league pattern with localStorage persistence and server-side array fetch"
    - "Playwright Wave 0: .fixme stubs committed before implementation so tests exist as failing targets"

key-files:
  created:
    - apps/web/tests/league-create.spec.ts
    - apps/web/tests/multi-league.spec.ts
    - apps/web/tests/predict-countdown.spec.ts
  modified:
    - apps/web/src/contexts/SessionContext.tsx
    - apps/web/src/pages/Join.tsx
    - apps/web/tests/helpers/mock-routes.ts

key-decisions:
  - "Active league stored in localStorage as activeLeagueId; cross-referenced against server memberships on load — injected IDs that are not in the array are silently ignored"
  - "league_members query uses array form (not .maybeSingle()) ordered by joined_at ascending; first membership is default active league"
  - "Authenticated users at /join/:code see 'Add this league?' confirmation screen; INSERT uses role='member' only — self-elevation to admin is not possible"

patterns-established:
  - "Pattern: loadSession() returns { session, leagues } tuple — session is derived from active league, leagues is the full array"
  - "Pattern: applySessionResult() callback keeps setSession + setLeagues in sync atomically"
  - "Pattern: Wave 0 stubs use test.fixme() so they appear as skipped (not failures) in CI"

requirements-completed:
  - LEAGUE-02
  - PREDICT-01
  - PREDICT-02
  - PREDICT-03

# Metrics
duration: 3min
completed: "2026-05-06"
---

# Phase 02 Plan 01: SessionContext Multi-League Refactor + Wave 0 Test Stubs Summary

**SessionContext refactored from single-.maybeSingle() membership to leagues[] array with localStorage-persisted activeLeagueId; Join.tsx fixed for authenticated multi-league joins; all Phase 2 Wave 0 Playwright stubs seeded**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-06T05:13:25Z
- **Completed:** 2026-05-06T05:16:18Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced single-membership `.maybeSingle()` session load with an ordered array query over `league_members`, mapping to `LeagueSummary[]`
- Added `setActiveLeague(leagueId)` to SessionContext: persists selection to localStorage, derives `session` from the chosen league without a server round-trip
- Fixed the authenticated-redirect bug in `Join.tsx`: users with an existing session now see an "Add this league?" confirmation UI instead of being silently bounced to `/`
- Extended `mock-routes.ts` with four new Phase 2 mock routes (create_league RPC, regenerate_invite_code RPC, leagues REST, league_members array)
- Created three Wave 0 stub spec files covering LEAGUE-01, LEAGUE-02, PREDICT-01/02/03, and PREDICT-04 — all `.fixme` so existing 5 tests still pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — Extend mock-routes and create stub spec files** - `b4718bb` (feat)
2. **Task 2: SessionContext multi-league refactor + Join.tsx authenticated-join fix** - `4cc77aa` (feat)

## Files Created/Modified

- `apps/web/src/contexts/SessionContext.tsx` - Multi-league refactor: exports LeagueSummary, leagues[], setActiveLeague; localStorage persistence; backward-compatible session shape
- `apps/web/src/pages/Join.tsx` - Authenticated-join confirmation flow; RPC lookup for league name; INSERT with role=member; refreshSession on success
- `apps/web/tests/helpers/mock-routes.ts` - Added MOCK_LEAGUE_2 constant and 4 new route mocks (create_league, regenerate_invite_code, leagues REST, league_members array)
- `apps/web/tests/league-create.spec.ts` - Wave 0: 3 fixme stubs for LEAGUE-01 create flow
- `apps/web/tests/multi-league.spec.ts` - Wave 0: 3 fixme stubs for LEAGUE-02 + 3 fixme smoke stubs for PREDICT-01/02/03 SessionContext refactor
- `apps/web/tests/predict-countdown.spec.ts` - Wave 0: 3 fixme stubs for PREDICT-04 countdown UX

## Decisions Made

- `leagues` array ordered by `joined_at` ascending — oldest membership is the default active league on first load, providing stable behavior
- localStorage cross-reference: stored `activeLeagueId` is only honored if it exists in the server-returned memberships array; unknown IDs fall back to `leagues[0]` silently (Threat T-02-04 accepted)
- `Join.tsx` uses `supabase.rpc("lookup_league_by_invite_code")` to resolve league name before showing confirmation — the league_id comes from the server RPC, not the URL, preventing spoofing (Threat T-02-02 mitigated)
- `INSERT league_members` with hardcoded `role: "member"` — creator cannot self-assign admin via the join flow

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- The Playwright `--project=chromium` flag must be run from `apps/web/` (not repo root) since the playwright config lives there. Root invocation returned "project not found". Resolved by running from the correct directory.

## User Setup Required

None — no external service configuration required. The Supabase RPC mocks in `mock-routes.ts` cover all network calls; no live DB changes in this plan.

## Next Phase Readiness

- Plan 02-02 (league creation flow) can execute immediately: SessionContext is stable, mock-routes has `create_league` mock, and `league-create.spec.ts` stubs are ready to go green
- Plan 02-03 (countdown UX + regenerate code) can execute in parallel: `predict-countdown.spec.ts` and `regenerate_invite_code` mock are both seeded
- All existing 5 auth tests continue to pass; TypeScript is clean (`tsc --noEmit` exits 0)
- The `leagues` array mock in `mock-routes.ts` returns 2 memberships — once Plans 02-02 and 02-03 make the PREDICT smoke stubs non-fixme, they will exercise the full multi-league path

---
*Phase: 02-league-prediction-core*
*Completed: 2026-05-06*
