---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-23T10:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 21
  completed_plans: 14
  percent: 67
---

# Project State - Fuut

## Project Reference

**Core Value**: Frictionless, retro-cool 2026 World Cup prediction game for friends.
**Current Focus**: Phase 5 — Global Polish & Tournament Readiness. Plans drafted (5 plans); ready to execute 05-01 (CI/CD pipelines, Wave 1).

## Current Position

**Phase**: 05 (Planning complete, ready to execute)
**Plan**: 05-01 next (CI/CD, Wave 1)
**Status**: ✅ Phase 1-4 COMPLETE. Phase 5 plans drafted (05-01..05-05); none executed yet.
**Progress**: [██████▋░░░] 67% overall (14/21 plans done)

## Performance Metrics

- **Requirement Coverage**: 100% (28/28 v1 requirements mapped)
- **Phase Completion**: 4/5
- **Plans Completed**: 14/21 (Phase 5 plans added 2026-06-01: +5)
- **Tests Passing**: 4/5 Playwright E2E (1 pre-existing auth.spec failure, fixed on PR #29)

## Accumulated Context

### Decisions

- **DEC-019**: Phase 4 focuses on engagement: curated bonus questions, peer visibility, shareable snapshots, and league limits. (D-01 to D-23 in 04-CONTEXT.md).
- **DEC-020** (04-03): Bonus questions are redacted server-side. `matches.bonus_question` is REVOKEd from `anon`/`authenticated` (table-revoke + per-column re-grant, since column-revoke alone is a no-op) and reachable only via the `get_matches_with_bonus()` RPC, which gates it on reveal time. All client readers (PredictTab, ResultsTab, AdminDashboard) use the RPC. Closes threat T-04-04.
- **DEC-021** (04-04): Peer predictions come from the `get_match_predictions()` RPC, which returns rows only once a match `is_final` (D-09). League rename/remove are admin-only SECURITY DEFINER RPCs (`rename_league`, `remove_member`; self-removal blocked) since leagues/league_members have no client UPDATE/DELETE policy. `ADMIN_CONTACT_EMAIL` lives in `app_config` (public read) and drives the D-22 "Request premium" mailto.
- **DEC-022** (04-05): Snapshot persistence skips an API wrapper — `snapshot_tokens` RLS (authenticated INSERT scoped to `auth.uid()`, public SELECT by token) covers create + read. Web client calls supabase directly. Public `/s/:token` teaser route lives in the SPA; per-route OG tags are best-effort client-side (proper social previews need a Vercel edge function — listed as follow-up).
- **DEC-023** (05-planning): Phase 5 = 5 plans in 4 waves. Wave 1 = 05-01 CI (foundation), Wave 2 = 05-02 PWA + 05-03 FR (parallel), Wave 3 = 05-04 theme (depends on FR for layout audit), Wave 4 = 05-05 perf (measures shipping build). Phase 5 has zero DB migrations — pure web-side polish. PWA caching uses `NetworkFirst` for Supabase REST + `NetworkOnly` for Realtime (D-05 in 05-CONTEXT). Performance target is 200 concurrent users per the PRD, validated with k6 against staging.

### Todos

- [x] Execute 04-01-PLAN.md — Database foundation and curated bonus question catalog seeding.
- [x] Execute 04-02-PLAN.md — Global Admin controls for reveal timing and league tier enforcement.
- [x] Execute 04-03-PLAN.md — Micro-predictions UI with countdown reveal and live scoring feedback.
- [x] Execute 04-04-PLAN.md — Peer visibility expansion and League Admin tools (rename/remove).
- [x] Execute 04-05-PLAN.md — Shareable ranking snapshots with pixel-art PNG generation.
- [ ] Execute 05-01-PLAN.md — CI/CD pipelines (Wave 1).
- [ ] Execute 05-02-PLAN.md — PWA installable + offline app shell (Wave 2).
- [ ] Execute 05-03-PLAN.md — French locale + hardcoded-string sweep (Wave 2).
- [ ] Execute 05-04-PLAN.md — Retro theme refinement (Wave 3, depends on 05-03).
- [ ] Execute 05-05-PLAN.md — Load readiness + performance (Wave 4, depends on 05-01..04).

### Blockers

- None.

## Session Continuity

**Last Action**: Wrote Phase 5 plans — 05-CONTEXT + 05-01..05-05 PLAN files on the `phase-05-plan` branch. Denominator updated from 16 → 21 (no progress lost, just inventoried Phase 5).
**Next Step**: Execute 05-01 (CI/CD pipelines, Wave 1). Then Wave 2 in parallel: 05-02 (PWA) + 05-03 (FR locale).
