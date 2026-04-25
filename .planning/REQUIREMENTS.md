# Requirements - Fuut

## V1 Requirements

### Setup & Infrastructure (SETUP)
- **SETUP-01**: Production infrastructure setup (Vercel/Railway/Supabase)
- **SETUP-02**: Backend service scaffolding (Express + TypeScript)
- **SETUP-03**: Supabase database schema & migrations
- **SETUP-04**: CI/CD pipelines (GitHub Actions)

### Authentication & User Accounts (AUTH)
- **AUTH-01**: User sign-up/login with email/password (Supabase Auth)
- **AUTH-02**: Frictionless entry with nickname (anonymous session/local storage transition)
- **AUTH-03**: Account verification & password reset
- **AUTH-04**: User profile management (name, locale)

### League Management (LEAGUE)
- **LEAGUE-01**: Create private league with name & invite code
- **LEAGUE-02**: Join league via 4-character code or WhatsApp link
- **LEAGUE-03**: League admin tools (rename, remove members, reset scores)
- **LEAGUE-04**: Monetization/Limits (Free vs Premium group sizes)

### Match Predictions (PREDICT)
- **PREDICT-01**: View upcoming World Cup match schedule
- **PREDICT-02**: Submit match score predictions
- **PREDICT-03**: Update predictions before deadline (X mins before kickoff)
- **PREDICT-04**: Locking mechanism for predictions

### Scoring & Leaderboards (SCORE)
- **SCORE-01**: Background scoring job (Cron) to fetch results from Sports API
- **SCORE-02**: Point calculation logic (Exact Score, Result match)
- **SCORE-03**: Real-time leaderboard updates within leagues
- **SCORE-04**: Manual result entry fallback for admins

### Social & Engagement (SOCIAL)
- **SOCIAL-01**: Micro-predictions (Bonus points) - Custom bets
- **SOCIAL-02**: Match history (view others' predictions after lock)
- **SOCIAL-03**: Shareable snapshots of rankings
- **SOCIAL-04**: In-app notifications/feedback on scoring

### Product & Polish (POLISH)
- **POLISH-01**: PWA support (offline access, installable)
- **POLISH-02**: Localization (English, Spanish, French)
- **POLISH-03**: Retro pixel-art theme refinement
- **POLISH-04**: Performance optimization (200 concurrent users)

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 5 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| LEAGUE-01 | Phase 2 | Pending |
| LEAGUE-02 | Phase 2 | Pending |
| LEAGUE-03 | Phase 4 | Pending |
| LEAGUE-04 | Phase 4 | Pending |
| PREDICT-01 | Phase 2 | Pending |
| PREDICT-02 | Phase 2 | Pending |
| PREDICT-03 | Phase 2 | Pending |
| PREDICT-04 | Phase 2 | Pending |
| SCORE-01 | Phase 3 | Pending |
| SCORE-02 | Phase 3 | Pending |
| SCORE-03 | Phase 3 | Pending |
| SCORE-04 | Phase 3 | Pending |
| SOCIAL-01 | Phase 4 | Pending |
| SOCIAL-02 | Phase 4 | Pending |
| SOCIAL-03 | Phase 4 | Pending |
| SOCIAL-04 | Phase 4 | Pending |
| POLISH-01 | Phase 5 | Pending |
| POLISH-02 | Phase 5 | Pending |
| POLISH-03 | Phase 5 | Pending |
| POLISH-04 | Phase 5 | Pending |
