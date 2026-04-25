# FIFA World Cup Prediction Game — Design Specification

**Date:** 2026-04-24 
**Status:** Approved 
**Project Type:** Commercial Freemium Web App 
**Scope:** Single FIFA World Cup Tournament

---

## Executive Summary

A freemium web-based match score prediction game for FIFA World Cup fans. Users create or join private leagues (via 4-letter invite codes), predict match outcomes, and compete on leaderboards. League managers customize scoring rules and bonus prediction types. Revenue via premium early access to bonus predictions and special prediction types.

**Key metrics:**
- 10K leagues/month, 200 concurrent users, 4 matches/day
- Global: English, Spanish, French localization
- Built for scale on monolithic foundation

---

## 1. Architecture & Tech Stack

### Backend
- **Runtime:** Node.js (Express)
- **Database:** Supabase (PostgreSQL + auth)
- **Real-time:** Supabase subscriptions (WebSocket)
- **Job scheduling:** Node cron for post-match scoring
- **External data:** Sports API (API-Football or ESPN) for match data

### Frontend
- **Framework:** React (or Next.js for SSR)
- **Localization:** i18n for EN/ES/FR
- **Real-time client:** Supabase real-time subscriptions

### Deployment
- Docker containerized backend
- Simple VPS or Vercel/Railway for frontend

### Why This Stack
- **Supabase:** Eliminates separate auth service, PostgreSQL already in use, real-time subscriptions reduce complexity vs manual WebSocket
- **Monolithic:** 200 concurrent users doesn't justify microservices; easier to iterate features fast
- **React:** Standard choice for interactive leaderboards and prediction UI

---

## 2. Core Data Model

### Users
```
id (uuid, pk)
email (string, unique)
name (string)
locale (enum: en | es | fr)
premium_until (timestamp, nullable)
created_at (timestamp)
```

### Leagues
```
id (uuid, pk)
code (string, 4 chars, unique)
name (string)
manager_id (uuid, fk users)
created_at (timestamp)
world_cup_year (int)
max_participants (int) — free tier: 20, premium: unlimited
is_premium_league (bool)
start_date (timestamp)
```

### League Members
```
id (uuid, pk)
league_id (uuid, fk leagues)
user_id (uuid, fk users)
joined_at (timestamp)
score (int, default 0)
```

### Matches
```
id (uuid, pk)
home_team (string)
away_team (string)
kickoff_time (timestamp)
status (enum: scheduled | finished)
final_score_home (int, nullable)
final_score_away (int, nullable)
first_goal_scorer (string, nullable) — for bonus predictions
world_cup_year (int)
```

### Predictions
```
id (uuid, pk)
league_id (uuid, fk leagues)
user_id (uuid, fk users)
match_id (uuid, fk matches)
predicted_score_home (int)
predicted_score_away (int)
predicted_result (enum: W | D | L)
bonus_predictions (jsonb) — structured per league config
submitted_at (timestamp)
updated_at (timestamp)
points_earned (int, nullable) — populated after match finishes
unique(league_id, user_id, match_id)
```

### Scoring Rules (per League)
```
id (uuid, pk)
league_id (uuid, fk leagues)
prediction_type (enum: exact_score | result | bonus_)
points (int)
custom (bool) — true if manager customized, false if default
```

**Defaults:**
- `exact_score`: 5 points
- `result` (W/D/L correct): 2 points
- `bonus_`: manager-defined per enabled bonus

### League Prediction Config
```
id (uuid, pk)
league_id (uuid, fk leagues)
enabled_bonus_predictions (jsonb array) — ["first_goal_scorer", "yellow_cards"]
prediction_deadline_minutes (int) — 120 | 60 | 30 (manager selects)
bonus_multiplier_on_tie (float, default 1.5) — tiebreaker bonus multiplier
```

### Premium Features Table
```
id (uuid, pk)
user_id (uuid, fk users)
feature_type (enum: early_bonus | special_prediction)
enabled (bool)
```

---

## 3. Core Features & API

### Authentication (Supabase)
- Email/password sign up, login, email verification via Supabase Auth
- Premium status: `user.premium_until > now()` check on frontend & backend

### League Management

**Create League** `POST /leagues`
- Request: `{ name, world_cup_year, start_date, is_premium }`
- Response: `{ id, code, manager_id }`
- Logic: Generate unique 4-char code, set caller as manager

**Join League** `POST /leagues/{code}/join`
- Validate code exists, league not at capacity
- Add user as league member, init score=0
- Return: `{ league_id, leaderboard }`

**Get League** `GET /leagues/{id}`
- Return: League details + live leaderboard (ranked by score)
- Leaderboard via Supabase real-time subscription

**Update League Config** `PATCH /leagues/{id}`
- Manager only
- Request: `{ enabled_bonus_predictions, custom_scoring_rules, prediction_deadline_minutes }`
- Validate only manager, update league_prediction_config table

**Remove Member** `DELETE /leagues/{id}/members/{user_id}`
- Manager only, cannot remove self

### Predictions

**List Upcoming Matches** `GET /matches`
- Filter: `status = 'scheduled'`, world_cup_year = current
- Return: `[{ id, home_team, away_team, kickoff_time, enabled_bonus_types }]`

**Submit Prediction** `POST /predictions`
- Request: `{ league_id, match_id, predicted_score_home, predicted_score_away, predicted_result, bonus_predictions }`
- Validation:
- User is league member
- Match not within deadline (now + deadline_minutes)
- No duplicate prediction (unique constraint enforced)
- Bonus predictions match enabled types
- Response: `{ id, points_earned: null }`

**Update Prediction** `PATCH /predictions/{id}`
- Same validation as submit, but only if before deadline
- Return updated prediction

**Get Predictions for User in League** `GET /leagues/{id}/predictions?user_id={user_id}`
- Return all predictions user made in league with points (populated if match finished)

### Scoring & Leaderboard

**Get Leaderboard** `GET /leagues/{id}/leaderboard`
- Return: Ranked list `[{ user_id, name, score, position }]`
- Ordered by score DESC, then bonus points DESC for tiebreaker
- Real-time via Supabase subscription on league_members table

**Background Scoring Job** (Cron, runs 10 minutes after each match kickoff time)
1. Fetch match result from sports API (API-Football)
2. For each prediction in all leagues for that match:
- Calculate points: exact score match? result match? bonus matches?
- Update `predictions.points_earned`
- Add points to `league_members.score`
3. Trigger Supabase event to refresh leaderboard on all connected clients
4. Error handling:
- API unreachable: retry 3x with exponential backoff (10s, 30s, 60s)
- Score mismatch (manual vs API): log alert, require admin manual override flag
- Never auto-correct scores without admin approval

### Premium Features

**Early Bonus Predictions**
- Premium users see bonus predictions available 2-4 hours before match
- Free users see them 30 min before match
- Flag in database: `premium_features.early_bonus = true`

**Special Prediction Types**
- Premium leagues unlock custom prediction types (e.g., "both teams score", "3+ goals")
- Stored in `league_prediction_config.enabled_bonus_predictions` with `premium: true` marker
- API returns 403 if free user tries to enable

---

## 4. Error Handling & Validation

### Input Validation
- **League code:** Exactly 4 alphanumeric chars (A-Z, 0-9)
- **Predictions:** Score ≥ 0, result ∈ {W, D, L}, bonus types match enabled list
- **Point values:** Positive integers only, ≤ 1000
- **User limits:** Email format, name 1-100 chars
- **Dates:** ISO 8601, kickoff_time must be in future, start_date ≤ kickoff_time

### Constraints
- **One prediction per match per league:** `UNIQUE(league_id, user_id, match_id)`
- **No prediction after deadline:** Enforced server-side via timestamp check
- **League capacity:** Free tier max 20, premium unlimited (enforced on join)
- **Premium features:** Check `premium_until > now()` before allowing
- **Manager operations:** Verify `user_id = league.manager_id` before update/delete

### Match Data Sync Errors
- **API failure:** Retry 3x, then admin manual entry flag
- **Score mismatch:** Log discrepancy, require admin toggle to update
- **Missing first_goal_scorer:** Allow null, some leagues may not use this bonus

### Auth & Authorization
- **Invalid token:** Supabase returns 401, frontend redirects to login
- **Invalid invite code:** Return 404 (do not leak existence of codes)
- **Non-manager access:** Return 403 with "Not league manager" message
- **Invalid league members:** Return 404

---

## 5. Testing Strategy

### Unit Tests
- **Scoring logic:** Given predictions array + final score, verify points calculated per rule
- Exact score 2-1 vs 2-1: 5 pts
- Exact score 2-1 vs 2-0: 0 pts
- Result correct (W vs W): 2 pts
- Bonus match: +X pts
- **League code generation:** Unique, length=4, alphanumeric
- **Input validation:** Rejects invalid scores, dates, enums
- **Premium check:** Correctly evaluates `premium_until > now()`

### Integration Tests
- **League creation flow:** Create league → verify code unique → manager can edit config
- **Multi-user prediction:** 3 users join league → each submit different predictions → run scoring job → verify leaderboard order correct
- **Deadline enforcement:** Submit prediction before deadline (success), after deadline (failure)
- **Update prediction:** Update before deadline (success), after deadline (failure)
- **Premium gates:** Free user tries special prediction type (403), premium user succeeds
- **Scoring edge cases:** Tie scores, bonus multiplier applied, missing bonus data

### E2E (Phase 2)
- User signup → join league (via code) → view upcoming matches → submit prediction → see leaderboard update real-time

### Load Testing (Pre-launch)
- 200 concurrent users submitting predictions simultaneously
- Leaderboard updates don't lag >2s after scoring job finishes

---

## 6. Known Decisions & Trade-offs

| Decision | Why | Trade-off |
|----------|-----|-----------|
| Monolithic backend | 200 concurrent users, fast iteration | Harder to scale later (refactor needed at 10K+) |
| Supabase over custom auth | Cuts dev time, real-time built-in | Vendor lock-in, limited customization |
| React frontend | Standard, rich interactive UI | Larger bundle, SEO challenges (mitigated with Next.js Phase 2) |
| One prediction per match per league | Different leagues different rules | Users might forget they already predicted elsewhere |
| Cron scoring (10m delay) | Simple, no race conditions | Leaderboard not instant (acceptable for casual game) |
| Manual sports API fallback | Prevents bad data corruption | Requires admin presence during tournament |

---

## 7. Out of Scope (Phase 1)

- Push notifications (add Phase 2)
- Mobile app native (web responsive covers mobile Phase 1)
- Betting integration (consider Phase 2+)
- Stats/analytics dashboard (Phase 2)
- Email reminders for deadline (Phase 2)
- Admin dashboard (manual DB edits Phase 1)
- Multi-tournament support (single World Cup Phase 1)
- User profile customization (basic Phase 1)

---

## 8. Success Metrics

- **Launch:** Deploy before World Cup tournament starts
- **Engagement:** 50%+ of signups create or join a league
- **Premium conversion:** 5%+ of active users upgrade
- **Leaderboard accuracy:** 100% prediction scoring correct post-match
- **Uptime:** 99.5% during tournament
- **Latency:** Leaderboard updates <2s after scoring job completes

---

## 9. File Structure

```
fifa-prediction-game/
├── backend/
│ ├── src/
│ │ ├── api/
│ │ │ ├── leagues.ts
│ │ │ ├── predictions.ts
│ │ │ ├── matches.ts
│ │ │ └── auth.ts (uses Supabase)
│ │ ├── jobs/
│ │ │ └── scoring.ts (cron)
│ │ ├── db/
│ │ │ ├── schema.ts (Supabase migrations)
│ │ │ └── queries.ts
│ │ └── main.ts
│ ├── tests/
│ │ ├── scoring.test.ts
│ │ ├── league.test.ts
│ │ └── predictions.test.ts
│ ├── Dockerfile
│ └── package.json
├── frontend/
│ ├── src/
│ │ ├── pages/
│ │ │ ├── Login.tsx
│ │ │ ├── LeagueDetail.tsx
│ │ │ ├── Predictions.tsx
│ │ │ └── Profile.tsx
│ │ ├── components/
│ │ │ ├── Leaderboard.tsx
│ │ │ ├── PredictionForm.tsx
│ │ │ └── MatchCard.tsx
│ │ ├── hooks/
│ │ │ ├── useLeaderboard.ts (real-time sub)
│ │ │ └── usePredictions.ts
│ │ └── main.tsx
│ └── package.json
└── docs/
└── API.md
```

---

## Next Steps

1. **Implementation Plan** (writing-plans skill) — detailed task breakdown
2. **Backend setup:** Express + Supabase migrations
3. **Frontend setup:** React + Supabase client
4. **Scoring job:** Cron + sports API integration
5. **Testing:** Unit + integration test suite
6. **Launch:** Deploy, open to beta users during tournament