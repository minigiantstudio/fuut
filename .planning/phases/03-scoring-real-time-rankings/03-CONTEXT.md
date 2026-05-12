# Phase 3: Scoring & Real-time Rankings - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 implements the automated backend that makes the game "live." It fetches real match results, calculates points, and pushes leaderboard updates to all users in real-time.

**In scope:**
- **Automated Scoring**: Background cron job (Express) polling Football-Data.org API.
- **Scoring Logic**: Implementation of 3/1 point system + per-match bonus predictions.
- **Bonus Predictions**: Connecting the existing `BonusPrediction` component to the database.
- **Real-time Leaderboards**: Integrating Supabase Realtime (CDC) to reflect point changes instantly.
- **Global Admin Dashboard**: A `/admin` route for global admins to manually enter scores as a fallback.

**Out of scope (Phase 4):**
- Social features like sharing ranking snapshots (SOCIAL-03).
- Advanced league admin tools (LEAGUE-03).
</domain>

<decisions>
## Implementation Decisions

### Scoring Source & Frequency

- **D-01: API Source**: Use **Football-Data.org** as the primary source for match results.
- **D-02: Live-Window Polling**: The scoring job (Express cron) will run every **5 minutes** ONLY when matches are currently live (based on `kickoff_at` windows). Outside of match windows, it can scale back to hourly or stop.

### Point Calculation & Tie-breakers

- **D-03: Point System**: Standard **3/1 scoring**.
    - **3 Points**: Exact score match (e.g. Predicted 2-1, Result 2-1).
    - **1 Point**: Correct outcome/winner (e.g. Predicted 2-1, Result 1-0).
- **D-04: Bonus Predictions**: Every match has a "Yes/No" bonus question (e.g., "Will a goalkeeper score?"). Correct answers award **2 points**.
- **D-05: Tie-breaker Hierarchy**:
    1. **Bonus Points**: User with more total bonus points ranks higher.
    2. **Most Exact Scores**: User with more exact score matches ranks higher.

### Real-time Strategy

- **D-06: Leaderboard Updates**: Use **Supabase Realtime (CDC)** to listen for changes in the `predictions` or `leaderboard_snapshots` tables. The `LeagueTab` should reflect these updates instantly without manual refresh.

### Manual Entry & Admin

- **D-07: Global Admin Dashboard**: Create a new route at **`/admin`** specifically for manual match result entry.
- **D-08: Global Admin Role**: Only users with a "Global Admin" flag (likely a boolean in the `users` table or an env var check) can access this dashboard. League creators cannot override global match results.

### Bonus Prediction UI

- **D-09: PredictTab Integration**: The existing `BonusPrediction` component (already prototyped) will be made functional in Phase 3. Predictions will be persisted to a new `bonus_answer` column in the `predictions` table.

### Claude's Discretion

- Database schema optimization for storing bonus questions (column in `matches` vs separate table).
- Logic for "Live Window" detection to optimize API polling costs.
- Exact UI design of the `/admin` dashboard.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Scoring and Matching code
- `apps/api/src/index.ts` — Express server entry point; add cron job here.
- `apps/web/src/components/tabs/PredictTab.tsx` — prediction UI; integrate bonus answers.
- `apps/web/src/components/BonusPrediction.tsx` — current prototype of bonus UI.
- `apps/web/src/components/tabs/LeagueTab.tsx` — leaderboard UI; add Realtime subscription.

### Schema and types
- `packages/types/src/database.types.ts` — `matches`, `predictions`, `leaderboard_snapshots` tables.
- `supabase/migrations/20260401000000_init_schema.sql` — check for existing `get_leaderboard` RPC logic.

### Planning context
- `.planning/REQUIREMENTS.md` — SCORE-01 through SCORE-04 definitions.
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/get_leaderboard` — Already exists in schema; needs to be updated to include tie-breaker logic.
- `leaderboard_snapshots` table — Can be used to store historical ranks for the `rank_delta` display.
- `BonusPrediction` component — UI is 90% ready, just needs data persistence.

### Established Patterns
- **API Fetching**: `apps/api` uses standard Express patterns.
- **Supabase Clients**: Both frontend and backend have typed clients.

### Integration Points
- `predictions` table — Needs `bonus_answer` (text/null) and `is_bonus_scored` (boolean) columns.
- `matches` table — Needs `bonus_question` (text) and `bonus_result` (boolean/null) columns.

</code_context>

<specifics>
## Specific Ideas

- The `/admin` dashboard should look as "retro" as the rest of the app — perhaps a list of matches with input fields for scores and a "Finalize" button.
- Use the `rank_delta` from `leaderboard_snapshots` to show those "up/down" arrows in the leaderboard from the prototype.

</specifics>

<deferred>
## Deferred Ideas

- Social sharing of leaderboard (Phase 4).
- Custom "micro-predictions" created by league admins (this phase focuses on global bonus questions).

</deferred>

---

*Phase: 03-scoring-real-time-rankings*
*Context gathered: 2026-05-11*
