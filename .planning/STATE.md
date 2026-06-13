---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-05-23T10:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 16
  completed_plans: 14
  percent: 88
---

# Project State - Fuut

## Project Reference

**Core Value**: Frictionless, retro-cool 2026 World Cup prediction game for friends.
**Current Focus**: Phase 4 — Social & Bonus Predictions COMPLETE (5/5). Next: Phase 5 (Global Polish & Tournament Readiness) or milestone wrap-up.

## Current Position

**Phase**: 04 COMPLETE
**Plan**: 04-05 complete (5/5 plans done)
**Status**: ✅ Phase 1-4 COMPLETE. Only Phase 5 (Global Polish & Tournament Readiness) remains.
**Progress**: [████████▊░] 88% overall

## Performance Metrics

- **Requirement Coverage**: 100% (28/28 v1 requirements mapped)
- **Phase Completion**: 4/5
- **Plans Completed**: 14/16
- **Tests Passing**: 4/5 Playwright E2E (1 pre-existing auth.spec failure, fixed on PR #29)

## Accumulated Context

### Decisions

- **DEC-019**: Phase 4 focuses on engagement: curated bonus questions, peer visibility, shareable snapshots, and league limits. (D-01 to D-23 in 04-CONTEXT.md).
- **DEC-020** (04-03): Bonus questions are redacted server-side. `matches.bonus_question` is REVOKEd from `anon`/`authenticated` (table-revoke + per-column re-grant, since column-revoke alone is a no-op) and reachable only via the `get_matches_with_bonus()` RPC, which gates it on reveal time. All client readers (PredictTab, ResultsTab, AdminDashboard) use the RPC. Closes threat T-04-04.
- **DEC-021** (04-04): Peer predictions come from the `get_match_predictions()` RPC, which returns rows only once a match `is_final` (D-09). League rename/remove are admin-only SECURITY DEFINER RPCs (`rename_league`, `remove_member`; self-removal blocked) since leagues/league_members have no client UPDATE/DELETE policy. `ADMIN_CONTACT_EMAIL` lives in `app_config` (public read) and drives the D-22 "Request premium" mailto.
- **DEC-022** (04-05): Snapshot persistence skips an API wrapper — `snapshot_tokens` RLS (authenticated INSERT scoped to `auth.uid()`, public SELECT by token) covers create + read. Web client calls supabase directly. Public `/s/:token` teaser route lives in the SPA; per-route OG tags are best-effort client-side (proper social previews need a Vercel edge function — listed as follow-up).
- **DEC-023**: Changed peer prediction visibility. Users can now see peer picks as soon as a match starts (`kickoff_at <= now()`), rather than waiting for `is_final`. This is implemented via an update to the `get_match_predictions` RPC and the `PredictTab` UI logic.

### Todos

- [x] Execute 04-01-PLAN.md — Database foundation and curated bonus question catalog seeding.
- [x] Execute 04-02-PLAN.md — Global Admin controls for reveal timing and league tier enforcement.
- [x] Execute 04-03-PLAN.md — Micro-predictions UI with countdown reveal and live scoring feedback.
- [x] Execute 04-04-PLAN.md — Peer visibility expansion and League Admin tools (rename/remove).
- [x] Execute 04-05-PLAN.md — Shareable ranking snapshots with pixel-art PNG generation.

### Blockers

- None.

## Session Continuity

**Last Action**: Executed 04-05 (snapshot PNG + share UI on RankingTab, public /s/:token teaser). Phase 4 complete.
**Next Step**: Phase 5 (Global Polish & Tournament Readiness) — or kick off the v1.0 milestone wrap-up.
