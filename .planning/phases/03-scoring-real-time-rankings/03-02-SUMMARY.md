---
phase: 03-scoring-real-time-rankings
plan: 02
status: complete
wave: 2
---

# Summary - Plan 03-02 (Scoring Service & Cron Job)

## Objective
Implement the core scoring engine and the background job that automates the game.

## Work Completed
- **Scoring Logic**: Implemented `calculatePoints` utility with 3/1/Bonus point rules.
- **Scoring Service**: Implemented `ScoringService` in `apps/api/src/services/scoring.service.ts`.
  - `scoreMatch(matchId)`: Updates all predictions for a match and triggers leaderboard recalculation.
  - `recalculateLeaderboard(leagueId)`: Aggregates points using the `get_leaderboard` RPC and stores snapshots with `rank_delta`.
- **Background Job**: Implemented `ScoringJob` in `apps/api/src/cron/scoring.job.ts`.
  - Uses `node-cron` to run every 5 minutes.
  - Implements "Live Window" optimization to poll only during active matches (15m before kickoff to 4h after).
  - Fetches results from `FootballApiClient` and updates local matches and predictions.
- **Integration**: Registered `ScoringJob` in `apps/api/src/index.ts`.

## Verification Results
- **Unit Tests**: `bun x vitest src/services/__tests__/scoring.test.ts` PASSED (8/8 tests).
- **Type Check**: `bun x tsc --noEmit` PASSED.
- **Implementation Audit**: Verified `ScoringJob` presence in `index.ts`.

## Lessons Learned
- TypeScript's strict mode required explicit casting for Supabase query results to `Prediction[]` row types.
- `date-fns` simplifies the "Live Window" logic significantly compared to manual date math.

## Next Step
Proceed to **Plan 03-03: Global Admin Dashboard** to provide a UI for manual score overrides and fallback management.
