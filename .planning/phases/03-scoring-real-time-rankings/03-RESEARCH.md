# Phase 3: Scoring & Real-time Rankings - Research

**Researched:** 2026-05-11
**Domain:** Match results integration, scoring logic, and real-time leaderboard updates
**Confidence:** HIGH

## Summary

Phase 3 transitions the application from a static prediction collector to a dynamic game. We will use the **Football-Data.org API** (Free Tier) to fetch live match results. A backend cron job in the Express API will poll for results every 5 minutes during "live windows" (match duration + buffer). Scoring logic will implement a 3/1 point system with an additional 2-point bonus for "Yes/No" side-bets. Real-time updates will be powered by **Supabase Realtime (CDC)**, ensuring the leaderboard reacts instantly to point changes.

**Primary recommendation:** Use `node-cron` for scheduling and implement a "Live Window" filter to stay within the 10 requests/minute API limit while maintaining high freshness during active matches.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01: API Source**: Use **Football-Data.org** as the primary source for match results.
- **D-02: Live-Window Polling**: The scoring job (Express cron) will run every **5 minutes** ONLY when matches are currently live.
- **D-03: Point System**: Standard **3/1 scoring** (3 exact, 1 outcome).
- **D-04: Bonus Predictions**: Every match has a "Yes/No" bonus question awarding **2 points**.
- **D-05: Tie-breaker Hierarchy**: 1. Bonus Points, 2. Most Exact Scores.
- **D-06: Leaderboard Updates**: Use **Supabase Realtime (CDC)** to reflect point changes instantly.
- **D-07: Global Admin Dashboard**: Create a new route at **`/admin`** for manual match result entry.
- **D-08: Global Admin Role**: Only users with a "Global Admin" flag can access this dashboard.
- **D-09: PredictTab Integration**: Make the `BonusPrediction` component functional.

### the agent's Discretion
- Database schema optimization for storing bonus questions.
- Logic for "Live Window" detection to optimize API polling costs.
- Exact UI design of the `/admin` dashboard.

### Deferred Ideas (OUT OF SCOPE)
- Social features like sharing ranking snapshots (Phase 4).
- Advanced league admin tools (Phase 4).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCORE-01 | Fetch match results from API | [VERIFIED: Football-Data.org v4 API] |
| SCORE-02 | Calculate points (3/1 + Bonus) | [CITED: D-03, D-04] |
| SCORE-03 | Update leaderboards in real-time | [VERIFIED: Supabase Realtime CDC] |
| SCORE-04 | Admin fallback for manual scoring | [CITED: D-07] |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Match Result Fetching | API / Backend | — | Controlled polling to manage API rate limits. |
| Point Calculation | API / Backend | — | Authority for scoring must reside in the backend. |
| Leaderboard Snapshots | Database | API / Backend | Snapshots calculated via RPC/Triggers or scheduled job. |
| Real-time Updates | Database (CDC) | Browser / Client | Supabase handles broadcasting changes to clients. |
| Admin Score Entry | Browser / Client | API / Backend | UI for entry, backend for persistence and re-scoring. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cron | 3.0.3 | Backend task scheduling | Industry standard for Express cron jobs. [VERIFIED: npm registry] |
| axios | 1.6.2 | API requests | Robust error handling and interceptors for auth. |
| @supabase/supabase-js | 2.38.0 | DB & Realtime | Standard SDK for Supabase interaction. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| date-fns | 3.6.0 | Date manipulation | Used for "Live Window" logic and UTC comparisons. |

**Installation:**
```bash
cd apps/api && npm install node-cron axios date-fns
npm install --save-dev @types/node-cron
```

## Architecture Patterns

### Polling & Scoring Flow
1. **Trigger:** `node-cron` fires every 5 minutes.
2. **Check:** Query `matches` for any record where `kickoff_at` < `now` AND `is_final` = `false`.
3. **Fetch:** If live matches exist, call `GET /v4/competitions/WC/matches` with `X-Auth-Token`.
4. **Update:** For each match returned as `FINISHED`:
   - Update `matches` table (`home_score`, `away_score`, `is_final`).
   - Trigger `calculate_points(match_id)` (Backend service).
   - Recalculate `leaderboard_snapshots` for affected leagues.

### Point Calculation Logic
```typescript
// Standard 3/1 Logic
let points = 0;
if (pHome === rHome && pAway === rAway) {
  points = 3; // Exact
} else if ((pHome > pAway && rHome > rAway) || 
           (pHome < pAway && rHome < rAway) || 
           (pHome === pAway && rHome === rAway)) {
  points = 1; // Outcome
}

// Bonus Logic
if (bonusAnswer === bonusResult) {
  points += 2;
}
```

### Recommended Project Structure
```
apps/api/src/
├── cron/
│   └── scoring.job.ts     # Main cron orchestration
├── services/
│   ├── football-api.ts    # Football-Data.org client
│   └── scoring.service.ts # Pure logic for point calculation
└── routes/
    └── admin.ts           # Admin fallback routes
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Task Scheduling | custom `setInterval` | `node-cron` | Handles persistence, timezone, and edge cases. |
| API Rate Limiting | custom bucket | `axios-retry` / logic | Simple "Live Window" checks are enough for 10req/min. |
| Real-time Socket | Custom WebSockets | Supabase Realtime | Zero-config CDC broadcasting. |

## Common Pitfalls

### Pitfall 1: Rate Limit Exhaustion
**What goes wrong:** Polling too frequently across multiple competitions or without "live window" checks.
**Prevention strategy:** Only poll if `matches` table shows an active/recent game that isn't `is_final`.

### Pitfall 2: Timezone Mismatches
**What goes wrong:** Comparing local server time with API UTC time erroneously.
**Prevention strategy:** Always use ISO strings and `date-fns` UTC helpers.

### Pitfall 3: Manual vs. Auto Conflicts
**What goes wrong:** Admin manually fixes a score, but the next cron run overwrites it.
**Prevention strategy:** Add an `is_manual_override` flag to matches, or simply stop polling for a match once `is_final` is true (and ensure admin sets `is_final`).

## Code Examples

### Supabase Realtime Subscription (Frontend)
```typescript
// apps/web/src/components/tabs/LeagueTab.tsx
const channel = supabase
  .channel('leaderboard-updates')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'leaderboard_snapshots',
      filter: `league_id=eq.${leagueId}`,
    },
    (payload) => {
      queryClient.invalidateQueries(['leaderboard', leagueId]);
    }
  )
  .subscribe();
```

### Live Window Logic
```typescript
// apps/api/src/cron/scoring.job.ts
const isLiveWindow = async () => {
  const { data: liveMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('is_final', false)
    .lt('kickoff_at', new Date(Date.now() + 15 * 60000).toISOString()) // Starts in 15 mins
    .gt('kickoff_at', new Date(Date.now() - 180 * 60000).toISOString()); // Started < 3hrs ago
  return (liveMatches?.length ?? 0) > 0;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom WebSocket | Supabase Realtime | 2022 | Drastic reduction in backend complexity. |
| Polling API every min | Event-driven or Live Windows | — | Saves API costs/limits. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | World Cup 2026 code is `WC` | Standard Stack | Wrong competition fetched; easily fixed by ID search. |
| A2 | Free tier includes WC | Standard Stack | Need to pay for API; alternative is manual entry only. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node-cron | Backend jobs | ✗ | — | Install via npm |
| Supabase Realtime | Updates | ✓ | — | Manual refresh |
| Football-Data API | Scoring | ✓ | v4 | Manual admin entry |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (Frontend), Jest (API) |
| Quick run command | `npm test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| SCORE-01 | API client returns match data | Integration | `npm run test:api -- football-api.test.ts` |
| SCORE-02 | Scoring logic matches 3/1/Bonus rules | Unit | `npm run test:api -- scoring.test.ts` |
| SCORE-03 | Frontend reacts to CDC event | E2E | `npx playwright test tests/realtime.spec.ts` |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | `is_global_admin` check for manual score updates. |
| V5 Input Validation | yes | Validate scores are non-negative integers. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized Scoring | Tampering | RLS policies and server-side role validation. |
| API Key Leak | Information Disclosure | Store Football-Data API key in server-side `.env` ONLY. |

## Sources

### Primary (HIGH confidence)
- [Football-Data.org API Docs](https://www.football-data.org/documentation/quickstart) - Rate limits and V4 structure.
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime) - CDC implementation.

### Metadata
**Confidence breakdown:**
- Standard stack: HIGH - Common Node/React stack.
- Architecture: HIGH - Follows existing project patterns.
- Pitfalls: MEDIUM - Dependent on 3rd party API reliability.

**Research date:** 2026-05-11
**Valid until:** 2026-06-11
