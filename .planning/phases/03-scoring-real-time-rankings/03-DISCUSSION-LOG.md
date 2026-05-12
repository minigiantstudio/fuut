# Phase 3: Scoring & Real-time Rankings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 03-scoring-real-time-rankings
**Areas discussed:** Scoring Source & Frequency, Point Calculation Logic, Real-time Strategy, Manual Override UI

---

## Scoring Source & Frequency

| Option | Description | Selected |
|--------|-------------|----------|
| Football-Data.org (Real API) | Free tier (limited calls), easy to set up. | ✓ |
| Mock/Simulator (Manual) | Use local static data or a mock server. | |
| Other API Provider | User provides their own API key/provider. | |

**User's choice:** Football-Data.org (Real API)
**Notes:** User also chose Live-Window Polling (every 5 mins during live matches).

---

## Point Calculation Logic

| Option | Description | Selected |
|--------|-------------|----------|
| 3/1 Standard | 3 pts for exact score, 1 pt for correct winner/draw. | ✓ |
| 3/2/1 Nuanced | 3 pts exact, 2 pts goal diff, 1 pt winner. | |

**User's choice:** 3/1 Standard
**Notes:** Tie-breakers defined as 1. Bonus Points (from per-match bonus predictions) and 2. Most Exact Scores.

---

## Real-time Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Realtime (CDC) | Instant updates when scores change. | ✓ |
| Polling (30s) | Refresh every 30 seconds. | |

**User's choice:** Supabase Realtime (CDC)

---

## Manual Override UI

| Option | Description | Selected |
|--------|-------------|----------|
| Admin Tab in League View | Sub-tab within League view. | |
| Global Admin Dashboard (/admin) | Dedicated top-level route. | ✓ |

**User's choice:** Global Admin Dashboard (/admin)
**Notes:** Permission restricted to "Global Admin Only".

---

## Bonus Predictions

**User's choice:** Add to PredictTab now.
**Notes:** Every match has a bonus prediction defined by admins (e.g. "Will a goalkeeper score?"). Worth 2 points. Prototype `BonusPrediction` component will be reused.

---

## Deferred Ideas

- Social sharing of leaderboard (Phase 4).
- Custom "micro-predictions" created by league admins.
