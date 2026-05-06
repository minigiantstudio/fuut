# Roadmap - Fuut

## Phases
- [ ] **Phase 1: Foundation & Onboarding** - Establish production environment and enable users to join.
- [x] **Phase 2: League & Prediction Core** - Create/join leagues and submit match predictions.
- [ ] **Phase 3: Scoring & Real-time Rankings** - Automate match scoring and update leaderboards.
- [ ] **Phase 4: Social & Bonus Predictions** - Increase engagement with social features and custom bets.
- [ ] **Phase 5: Global Polish & Tournament Readiness** - Finalize PWA, localization, and performance.

## Phase Details

### Phase 1: Foundation & Onboarding
**Goal**: Establish production environment and enable users to join.
**Depends on**: Nothing
**Requirements**: SETUP-01, SETUP-02, SETUP-03, AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria**:
  1. Users can sign up and log in via Supabase.
  2. Anonymous users can pick a nickname and it persists to an account.
  3. Database schema is deployed and accessible.
  4. Backend Express service is running and connected to Supabase.
**Plans**:
- [ ] 01-01-PLAN.md — Initialize monorepo structure and shared types.
- [ ] 01-02-PLAN.md — Setup Supabase schema and Express auth middleware.
- [ ] 01-03-PLAN.md — Implement frontend auth flow (Anonymous -> Email).
- [ ] 01-04-PLAN.md — End-to-end auth verification and connectivity tests.
**UI hint**: yes

### Phase 2: League & Prediction Core
**Goal**: Users can create/join leagues and make predictions.
**Depends on**: Phase 1
**Requirements**: LEAGUE-01, LEAGUE-02, PREDICT-01, PREDICT-02, PREDICT-03, PREDICT-04
**Success Criteria**:
  1. User can create a league and share a 4-char code.
  2. User can join a league using a code.
  3. User can submit and edit predictions for upcoming matches.
  4. Predictions are locked based on kickoff time.
**Plans**: 3 plans
- [x] 02-01-PLAN.md — SessionContext multi-league refactor + Join.tsx fix + Wave 0 test stubs.
- [x] 02-02-PLAN.md — League creation flow (Onboarding fork + RPC migration + TopBar switcher + LeagueTab regenerate).
- [x] 02-03-PLAN.md — Prediction countdown UX ("Locks in Xh Ym" label on PredictTab).
**UI hint**: yes

### Phase 3: Scoring & Real-time Rankings
**Goal**: Matches are scored and leaderboards update automatically.
**Depends on**: Phase 2
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04
**Success Criteria**:
  1. Backend job successfully fetches match results from Sports API.
  2. Points are calculated and assigned to users correctly.
  3. Leaderboard updates in real-time without page refresh.
  4. Admins can manually override scores if needed.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Social & Bonus Predictions
**Goal**: Increase engagement with social features and custom bets.
**Depends on**: Phase 3
**Requirements**: SOCIAL-01, SOCIAL-02, SOCIAL-03, SOCIAL-04, LEAGUE-03, LEAGUE-04
**Success Criteria**:
  1. Admins can create custom micro-predictions.
  2. Users can see each other's predictions after matches start.
  3. Users can share ranking snapshots to WhatsApp/Telegram.
  4. League limits and premium features are enforced.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Global Polish & Tournament Readiness
**Goal**: Finalize PWA, multi-language, and performance for launch.
**Depends on**: Phase 4
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, SETUP-04
**Success Criteria**:
  1. App is fully localized in English, Spanish, and French.
  2. App is installable as a PWA.
  3. Load testing confirms stability for 200 concurrent users.
  4. CI/CD pipeline is fully operational.
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Onboarding | 0/4 | Not started | - |
| 2. League & Prediction Core | 3/3 | UAT pending | 2026-05-06 |
| 3. Scoring & Real-time Rankings | 0/1 | Not started | - |
| 4. Social & Bonus Predictions | 0/1 | Not started | - |
| 5. Global Polish & Tournament Readiness | 0/1 | Not started | - |
