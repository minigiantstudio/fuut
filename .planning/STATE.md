---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-23T10:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 16
  completed_plans: 13
  percent: 81
---

# Project State - Fuut

## Project Reference

**Core Value**: Frictionless, retro-cool 2026 World Cup prediction game for friends.
**Current Focus**: Phase 4 — Social & Bonus Predictions (executing; 04-04 done).

## Current Position

**Phase**: 04 (In Progress)
**Plan**: 04-04 complete (4/5 plans done)
**Status**: ✅ Phase 1-3 COMPLETE. Phase 4 in progress: 04-01..04-04 done; 04-05 remains.
**Progress**: [████████░░] 81% overall

## Performance Metrics

- **Requirement Coverage**: 100% (28/28 v1 requirements mapped)
- **Phase Completion**: 3/5
- **Plans Completed**: 13/16
- **Tests Passing**: 4/5 Playwright E2E (1 pre-existing auth.spec failure, fixed on PR #29)

## Accumulated Context

### Decisions

- **DEC-019**: Phase 4 focuses on engagement: curated bonus questions, peer visibility, shareable snapshots, and league limits. (D-01 to D-23 in 04-CONTEXT.md).
- **DEC-020** (04-03): Bonus questions are redacted server-side. `matches.bonus_question` is REVOKEd from `anon`/`authenticated` (table-revoke + per-column re-grant, since column-revoke alone is a no-op) and reachable only via the `get_matches_with_bonus()` RPC, which gates it on reveal time. All client readers (PredictTab, ResultsTab, AdminDashboard) use the RPC. Closes threat T-04-04.
- **DEC-021** (04-04): Peer predictions come from the `get_match_predictions()` RPC, which returns rows only once a match `is_final` (D-09). League rename/remove are admin-only SECURITY DEFINER RPCs (`rename_league`, `remove_member`; self-removal blocked) since leagues/league_members have no client UPDATE/DELETE policy. `ADMIN_CONTACT_EMAIL` lives in `app_config` (public read) and drives the D-22 "Request premium" mailto.

### Todos

- [x] Execute 04-01-PLAN.md — Database foundation and curated bonus question catalog seeding.
- [x] Execute 04-02-PLAN.md — Global Admin controls for reveal timing and league tier enforcement.
- [x] Execute 04-03-PLAN.md — Micro-predictions UI with countdown reveal and live scoring feedback.
- [x] Execute 04-04-PLAN.md — Peer visibility expansion and League Admin tools (rename/remove).
- [ ] Execute 04-05-PLAN.md — Shareable ranking snapshots with pixel-art PNG generation.

### Blockers

- None.

## Session Continuity

**Last Action**: Executed 04-04 (peer visibility RPC + UI, league rename/remove RPCs + LeagueTab tools, Request-premium mailto).
**Next Step**: Execute 04-05 (shareable ranking snapshots with pixel-art PNG).
