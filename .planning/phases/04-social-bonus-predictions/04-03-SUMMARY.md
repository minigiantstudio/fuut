---
phase: 04-social-bonus-predictions
plan: 03
status: complete
wave: 2
requirements-completed: [SOCIAL-01, SOCIAL-04]
---

# Summary - Plan 04-03 (Bonus question reveal + live scoring toasts)

## Objective
Implement the micro-prediction user experience and live scoring feedback:
server-side redaction so bonus questions can't be scraped before the reveal
window, a locked countdown placeholder on `PredictTab`, inline answering once
revealed, and a Sonner toast when a match is scored.

## Work Completed

### Task 1 — Server-side bonus question redaction RPC
- **File**: `supabase/migrations/20260527000000_phase4_get_matches_with_bonus.sql`
- New `public.get_matches_with_bonus()` — `SECURITY DEFINER`, `STABLE`,
  `SET search_path = public`. Returns the full match row plus:
  - `bonus_question` redacted to `NULL` until
    `now() >= kickoff_at - bonus_reveal_lead_minutes` (default 60, read from
    `app_config` via `(value::text)::int` per the 04-02 jsonb-scalar lesson).
  - `reveal_at` (timestamp) and `is_bonus_revealed` (boolean) for the client
    countdown.
- **Real column lockdown (threat T-04-04).** A naive
  `REVOKE SELECT (bonus_question)` is a no-op — a table-wide SELECT grant
  overrides column-level revokes. Replaced with `REVOKE SELECT ON matches` +
  `GRANT SELECT` on every column **except** `bonus_question`, for both `anon`
  and `authenticated`. Verified at the DB: a direct
  `matches?select=bonus_question` from either client role now returns
  "permission denied"; the only path to the column is the redaction RPC.
- RPC granted to `anon` + `authenticated` (the admin dashboard reads with the
  anon key). Redaction is identical regardless of caller, so anon access leaks
  nothing.

### Task 2 — PredictTab bonus question UI
- **Files**: `apps/web/src/components/tabs/PredictTab.tsx`,
  `apps/web/src/components/BonusPrediction.tsx`,
  `apps/web/src/lib/supabase/types.ts`
- `PredictTab` fetches matches through `get_matches_with_bonus` instead of a
  direct table select, and passes `is_bonus_revealed` / `reveal_at` into
  `BonusPrediction`.
- `BonusPrediction` renders a locked placeholder
  `🔒 Surprise bonus reveals in Xh Ym` (D-08, copy mirrors Phase 2 D-09 lock
  vocabulary, `tracking-[0.3em]` retro styling) with a 30s countdown until
  `is_bonus_revealed` flips true, then the existing yes/no toggle.
- New `DbMatchWithBonus` type for the RPC's `reveal_at` + `is_bonus_revealed`.

### Task 3 — Scoring feedback (Sonner toasts)
- **File**: `apps/web/src/components/tabs/RankingTab.tsx`
- Extended the existing `leaderboard_snapshots` realtime subscription: when the
  current user's snapshot INSERT arrives (match scored), `toast.success` fires
  with points earned and new rank/movement.
- `pts_earned` is derived by diffing the snapshot's `total_points` against the
  cached leaderboard (the payload carries running totals, not per-match deltas);
  the baseline refreshes on the existing invalidate.
- Filtered to the current user (D-15); a zero-change event is suppressed to
  avoid noise.

## Deviations from Plan

1. **[Rule 2 — Missing critical] RPC lives in a migration, not `apps/api/src/rpc/`.**
   The plan named `apps/api/src/rpc/get_matches_with_bonus.sql`, but the repo
   convention (and 04-02's `join_league_by_code`) puts Postgres functions in
   `supabase/migrations/`. Created
   `20260527000000_phase4_get_matches_with_bonus.sql` instead.

2. **[Rule 2 — Missing critical] Column lockdown + ResultsTab + AdminDashboard.**
   Plan `files_modified` listed only PredictTab, RankingTab and the RPC file.
   Fully mitigating T-04-04 requires REVOKEing the `bonus_question` column, which
   breaks every direct reader of it. So `ResultsTab.tsx` and
   `admin/AdminDashboard.tsx` were also migrated onto the RPC. `EnterResult.tsx`
   was unaffected (pure UPDATE, no `bonus_question` read). The user explicitly
   chose the full lockdown over RPC-only redaction.

3. **[Rule 1 — Bug] `group_name` phantom column.** The first RPC draft selected
   `m.group_name`, but `matches` has no such column (it's declared only in the
   frontend `DbMatch` type and always came back `undefined` from `select('*')`).
   `supabase db reset` aborted on it. Fixed by returning `NULL::text AS
   group_name` in the same position, preserving the existing (empty) group-filter
   behavior.

4. **[Rule 1 — Bug] `is_manual_override` added to RPC.** AdminDashboard needs it;
   added to the RPC return so the admin can read everything through one call.

5. **[Housekeeping] Regenerated `packages/types/src/database.types.ts`.** Picked
   up `get_matches_with_bonus` and the `join_league_by_code` type that was never
   regenerated after 04-02.

**Total deviations:** 5 (2 scope additions for the threat mitigation, 2
auto-fixed bugs, 1 housekeeping). **Impact:** larger blast radius than the plan
named (ResultsTab + AdminDashboard touched), but required to actually close
T-04-04. No behavior regressions observed.

## Verification Results

### Database
- `supabase db reset` — PASS. All 9 migrations apply cleanly, seed completes.
- Privilege checks (`has_column_privilege`):
  - `bonus_question` SELECT: `anon` = false, `authenticated` = false ✅
  - other columns (`home_team`, `bonus_result`, `is_manual_override`): true ✅
  - RPC EXECUTE: `anon` = true, `authenticated` = true ✅
- `SET ROLE anon; SELECT bonus_question FROM matches` → permission denied ✅
- RPC redacts all 72 future matches (0 question text leaked); `reveal_at` is
  exactly 60 min before kickoff ✅
- Reveal transition: a match moved to 30 min out (inside the window) returns the
  question text with `is_bonus_revealed = true` ✅

### Type / lint
- `bunx tsc --noEmit` — PASS in `apps/web`, `apps/api`, `packages/types`.
- `bun run lint` — PASS in `apps/web` (one pre-existing `react-refresh` warning
  in `SessionContext.tsx`, unrelated).

### Playwright
- 4 pass / 1 fail / 12 fixme-skipped.
- The failure is the same pre-existing `tests/auth.spec.ts:19` onboarding bug
  from `main`, fixed on branch `fix/playwright-local-e2e` (PR #29). It does not
  reference matches/bonus and is unrelated to this plan.

## Bugs Found and Fixed
- **`get_matches_with_bonus` referenced a non-existent `matches.group_name`
  column** — caused `supabase db reset` to abort. Fixed with `NULL::text AS
  group_name` (see Deviation 3).
- **Column-level REVOKE was ineffective** — the bonus_question column stayed
  readable despite the revoke because of the overriding table-wide grant. Fixed
  with table-revoke + explicit column grant (see Deviation 2 / Task 1).

## Lessons Learned
- Postgres column-level `REVOKE` cannot subtract from a table-wide `GRANT`. To
  gate a single column you must revoke table SELECT and re-grant the allowed
  columns explicitly. Verify with `has_column_privilege(role, table, col,
  'SELECT')`, not by reading the migration.
- `matches.group_name` is a phantom: declared in `apps/web` types but never in
  any migration. `select('*')` silently omitted it; an explicit RPC column list
  surfaced the gap. Worth either adding the column or removing it from the type
  as a follow-up.
- The `packages/types` generated file is regenerated with `supabase gen types
  typescript --local` and had drifted (missing 04-02's RPC). A `gen:local`
  script (04-01 follow-up) would make this routine.

## Follow-ups (not in this PR)
- Decide `matches.group_name`'s fate: add the real column (group-stage filter is
  currently always empty) or drop it from the frontend type.
- Any future column on `matches` must be added to the migration's `GRANT SELECT`
  list or it will be unreadable by clients — document near the schema.
- Toast copy says "Match scored" rather than "Match X scored": the
  `leaderboard_snapshots` payload carries no match identity. A future iteration
  could pair a `matches` channel to name the match.
- Add the `gen:local` script to `packages/types/package.json` (04-01 follow-up).

## Next Step
Phase 4 has two plans remaining: **04-04** (peer visibility + League Admin
tools) and **04-05** (shareable ranking snapshots).
