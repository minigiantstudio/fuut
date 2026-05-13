---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-11T12:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 11
  completed_plans: 9
  percent: 81
---

# Project State - Fuut

## Project Reference

**Core Value**: Frictionless, retro-cool 2026 World Cup prediction game for friends.
**Current Focus**: Phase 3 — Scoring & Real-time Rankings.

## Current Position

**Phase**: 03 (In progress)
**Plan**: 03-04 (next)
**Status**: ✅ Phase 1 COMPLETE. ✅ Phase 2 COMPLETE (UAT pending). ✅ Phase 3 PLANNING COMPLETE. ✅ Phase 3, Plan 01 COMPLETE. ✅ Phase 3, Plan 02 COMPLETE. ✅ Phase 3, Plan 03 COMPLETE.
**Progress**: [█████████░] 86% overall (plans 1–10 done; plan 11 ready)

## Performance Metrics

- **Requirement Coverage**: 100% (28/28 v1 requirements mapped)
- **Phase Completion**: 2/5 (Phase 2 code-complete, UAT pending; Phase 3 planned)
- **Plans Completed**: 7/11 (4 Phase 1 + 3 Phase 2 + 0/4 Phase 3)
- **Tests Passing**: 5/5 Playwright E2E (12 Wave 0 stubs skipped — will be activated in Phase 3)
- **Build**: ✅ `apps/web` (vite build) + `apps/api` (tsc) — zero errors
- **Type Check**: ✅ `tsc --noEmit` passes in both apps
- **Lint**: ✅ Zero errors
- **API**: ✅ Boots and responds `OK` on `/health`

## Accumulated Context

### Decisions

- **DEC-001**: Use Supabase for Auth, DB, and Real-time updates.
- **DEC-002**: Use Express for backend scoring jobs and complex business logic.
- **DEC-011**: Football-Data.org as primary scoring source (D-01).
- **DEC-012**: 5-minute polling window during live matches (D-02).
- **DEC-013**: Standard 3/1 point system + 2 bonus points (D-03, D-04).
- **DEC-014**: Tie-breaker: Bonus Points > Most Exact Scores (D-05).
- **DEC-015**: Supabase Realtime (CDC) for leaderboard updates (D-06).
- ~~**DEC-016**: Admin authorization uses DB lookup of `is_global_admin`~~ — **SUPERSEDED by DEC-018**.
- ~~**DEC-017**: `Session` type extended with `isGlobalAdmin`~~ — **SUPERSEDED by DEC-018** (frontend no longer carries admin state; admin manages its own JWT in localStorage, separate from `SessionContext`).
- **DEC-018**: Admin lives in an **isolated subtree** inside `apps/web/src/admin/` (own routes `/admin/login` + `/admin`, own auth state, no `SessionContext` coupling) — not a separate Vite workspace. Credentials are read from API env vars (`ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` bcrypt) — DB is not consulted for admin identity. Login issues an HMAC-signed JWT (`ADMIN_JWT_SECRET`, 8h expiry) verified by a new `requireAdminToken` middleware. Picks the env-var branch of D-08, replacing the DB-flag branch chosen by the now-superseded DEC-016.

### Todos

- [X] Execute `03-01-PLAN.md` — Database schema expansion and Football API client foundation.
- [X] Execute `03-02-PLAN.md` — Scoring engine implementation and background cron job.
- [X] Execute `03-03-PLAN.md` — Global Admin Dashboard for manual score overrides.
- [ ] Execute `03-04-PLAN.md` — Real-time leaderboard reactivity and functional bonus predictions.

### Blockers

- None.

## Session Continuity

**Last Action**: Plan 03-03 PIVOTED — DB-flag admin guard (DEC-016/017) superseded by dedicated `apps/admin/` app with env-var creds + HMAC JWT (DEC-018). Rework in progress on branch `phase-03-03`.
**Next Step**: Finish 03-03 rework (apps/admin workspace, admin-auth backend, revert is_global_admin from web + DB), UAT, then `03-04-PLAN.md`.
