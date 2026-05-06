---
phase: 02-league-prediction-core
plan: "03"
subsystem: ui
tags: [react, typescript, countdown, setinterval, useeffect, predicttab, playwright]

# Dependency graph
requires:
  - phase: 02-league-prediction-core
    plan: "01"
    provides: PredictTab.tsx with multi-league session, Wave 0 predict-countdown.spec.ts stubs

provides:
  - getLocksInLabel() module-level pure function in PredictTab.tsx
  - 60-second setInterval tick driving live countdown re-evaluation
  - "Locks in Xh Ym" / "Locks in Ym" label rendered on open match rows within 24h window
  - Proper cleanup via clearInterval on unmount

affects:
  - Wave 0 predict-countdown.spec.ts stubs (PREDICT-04) — ready to be un-fixme'd when match mocks include near-kickoff times

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side countdown: pure function + setInterval tick state + useMemo recompute — no server roundtrip"
    - "IIFE in JSX: (() => { ... })() pattern for inline conditional logic that computes and returns"

key-files:
  created: []
  modified:
    - apps/web/src/components/tabs/PredictTab.tsx

key-decisions:
  - "getLocksInLabel is a module-level pure function (not inside component) — testable in isolation, no closure over component state"
  - "tick state added to matches useMemo dependency array so countdown label recomputes every minute without a full component re-mount"
  - "Countdown rendered only for uiStatus === 'open' — saved/locked/needs_result rows show no label, consistent with D-10 (purely informational)"
  - "eslint-disable-next-line react-hooks/exhaustive-deps added above tick dependency — tick is not a reactive value from props/context, it's a pure clock signal"

patterns-established:
  - "Pattern: 60s tick via useState + setInterval + clearInterval — use this pattern for any live time display that should update while tab is open"

requirements-completed:
  - PREDICT-04

# Metrics
duration: 4min
completed: "2026-05-06"
---

# Phase 02 Plan 03: Prediction Countdown UX Summary

**"Locks in Xh Ym" countdown label added to PredictTab via pure getLocksInLabel() function + 60-second setInterval tick, gated to open matches within the 24-hour kickoff window**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-06T05:17:00Z
- **Completed:** 2026-05-06T05:21:47Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `getLocksInLabel(kickoffAt: string): string | null` as a module-level pure function that computes client-side time diff and returns the formatted label or null
- Introduced a `tick` state driven by a 60-second `setInterval` (with `clearInterval` cleanup on unmount) so the countdown re-evaluates every minute while the PredictTab is open
- Added `tick` to the `matches` useMemo dependency array so label values recompute each tick without additional queries
- Rendered the countdown label in a new `flex-col` wrapper below the kickoff date/time line, visible only when `match.uiStatus === "open"` and `getLocksInLabel()` returns a non-null value
- All 5 existing Playwright E2E tests pass; 12 Wave 0 fixme stubs remain skipped; TypeScript exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getLocksInLabel() + 60s tick + countdown label to PredictTab** - `6ea70a5` (feat)

## Files Created/Modified

- `apps/web/src/components/tabs/PredictTab.tsx` - Added useEffect import, getLocksInLabel() pure function, tick state + 60s interval, countdown label in match row render

## Decisions Made

- `getLocksInLabel` is placed at module level (not inside the component) to keep it a pure function with no closure dependencies — this also makes it straightforward to unit test in isolation if a Vitest suite is added later
- `tick` is added to `matches` useMemo dependencies with an `eslint-disable` comment because it is a clock signal, not a reactive prop value — the linter would otherwise flag it as an unnecessary dependency
- The countdown label is wrapped in an IIFE inside JSX (`(() => { const label = ...; return label ? ... : null; })()`) to compute and conditionally render in one expression without introducing a separate computed variable in the map callback
- No changes to the locking logic itself — per D-10, `getLocksInLabel` is purely informational; `kickoff_at <= now` locking remains server-enforced at prediction save time

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- The plan's acceptance criteria states `grep -n 'uiStatus === "open"'` should return at least 2 matches, citing "original isLocked check AND the new countdown gate." The original `isLocked` check uses `locked` and `needs_result` (not `open`), so only 1 strict-equality match exists at the countdown gate (line 234). The implementation is correct; the acceptance criteria description slightly misread the original code. The `uiStatus = "open"` assignment (line 97) is a setter, not a comparison. All other acceptance criteria pass.

## User Setup Required

None — no external service configuration required. All changes are client-side UI; no Supabase schema or environment variable changes.

## Next Phase Readiness

- Plan 02-03 is complete. PREDICT-04 requirement is met in implementation.
- The Wave 0 `predict-countdown.spec.ts` stubs (3 tests, all `.fixme`) can be activated in a future plan by adding a near-kickoff match to the `mock-routes.ts` matches mock and removing the `.fixme` annotations.
- TypeScript is clean; existing 5 auth tests pass; build is stable.

---
*Phase: 02-league-prediction-core*
*Completed: 2026-05-06*
