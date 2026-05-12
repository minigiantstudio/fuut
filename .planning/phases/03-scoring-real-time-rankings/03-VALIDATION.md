# Phase 3 Validation: Scoring & Real-time Rankings

This document defines the validation criteria and test suite for Phase 3.

## Validation Architecture

### Test Framework
- **Frontend:** Vitest + React Testing Library
- **API:** Vitest (using `bun test`)
- **E2E:** Playwright (for Real-time checks)

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| SCORE-01 | API client returns match data | Integration | `cd apps/api && bun test src/services/football-api.test.ts` |
| SCORE-02 | Scoring logic matches 3/1/Bonus rules | Unit | `cd apps/api && bun test src/services/scoring.test.ts` |
| SCORE-03 | Frontend reacts to CDC event | E2E | `npx playwright test tests/realtime.spec.ts` |
| SCORE-04 | Admin fallback for manual scoring | Integration | `cd apps/api && bun test src/routes/admin.test.ts` |

## Success Truths (Goal-Backward)

### SCORE-01: Fetch match results from API
- [ ] `FootballApiClient` correctly parses Football-Data.org v4 JSON.
- [ ] `X-Auth-Token` is successfully sent in headers.
- [ ] Rate limiting (10req/min) is handled via "Live Window" logic.

### SCORE-02: Calculate points (3/1 + Bonus)
- [ ] Exact score (Home/Away match) = 3 points.
- [ ] Correct outcome (Home/Away/Draw) = 1 point.
- [ ] Bonus answer matches bonus result = 2 points.
- [ ] Tie-breaker: Bonus Points > Exact Matches > Total Points.

### SCORE-03: Update leaderboards in real-time
- [ ] `RankingTab` subscribes to `leaderboard_snapshots` changes.
- [ ] UI refreshes data without page reload on CDC event.
- [ ] Rank deltas (movement indicators) reflect new positions.

### SCORE-04: Admin fallback for manual scoring
- [ ] `/admin` route redirects non-admin users.
- [ ] Admin can input scores and bonus results manually.
- [ ] Manual override flag prevents cron from overwriting admin entry.

## Execution Verification List

### Wave 1: Foundation
- [ ] `supabase db reset` applies migration without errors.
- [ ] `bun install` in `apps/api` succeeds.
- [ ] `football-api.ts` passes integration tests with mocked API response.

### Wave 2: Core Logic & Admin
- [ ] `scoring.service.ts` passes unit tests for all scoring scenarios.
- [ ] Cron job logs show polling only during live windows.
- [ ] Admin API endpoints return 403 for non-admin tokens.

### Wave 3: Real-time UI
- [ ] Bonus predictions persist in DB.
- [ ] Manual DB update to `leaderboard_snapshots` triggers UI refresh.
