---
phase: 04-social-bonus-predictions
plan: 04
status: complete
wave: 3
requirements-completed: [SOCIAL-02, LEAGUE-03, LEAGUE-04]
---

# Summary - Plan 04-04 (Peer visibility + League admin tools)

## Objective
Reveal other members' predictions on SCORED matches, give league admins
rename/remove-member tools, and surface a "Request premium" path when a free
league hits its member cap.

## Work Completed

### Task 1 — Peer visibility on SCORED matches (SOCIAL-02, D-09/D-10)
- **New RPC** `get_match_predictions(p_league_id, p_match_id)` — SECURITY
  DEFINER. Returns every league member's prediction for a match, but only once
  the match `is_final` (SCORED); before that it returns an empty set so live
  picks can't be scraped. Caller must be a league member.
- **New component** `apps/web/src/components/PeerPredictions.tsx` — fetches the
  RPC and renders the list sorted: current user first, then admin, then
  alphabetical (D-10). Shows "No prediction" for members who didn't play.
- **`PredictTab.tsx`** — SCORED cards are now tappable to expand/collapse the
  peer list, with a `▾ League predictions` affordance. Non-scored locked cards
  (needs_result) stay inert.

### Task 2 — League admin tools (LEAGUE-03, D-18/D-19/D-20)
- **New RPC** `rename_league(p_league_id, p_new_name)` — admin-only (T-04-05),
  trims + caps name at 50 chars.
- **New RPC** `remove_member(p_league_id, p_user_id)` — admin-only soft remove
  (T-04-06): deletes only the `league_members` row (predictions kept/orphaned),
  and blocks an admin removing themselves (single-admin model, D-18).
- **`LeagueTab.tsx`** — pencil icon next to the league name opens an inline
  rename input (Enter/Esc/✓/✗); trash icon on each non-admin member row opens a
  confirm dialog that calls `remove_member`. Both gated on `isAdmin`. Removed
  the dead placeholder "Rename league" button.

### Task 3 — Request Premium mailto (LEAGUE-04, D-22)
- **New app_config row** `ADMIN_CONTACT_EMAIL` (default `admin@fuut.app`),
  readable via the existing public `app_config` SELECT, tunable without a
  rebuild.
- **`LeagueTab.tsx`** — added `tier` to the league query and an `app_config`
  query for `LEAGUE_FREE_MAX_MEMBERS` + `ADMIN_CONTACT_EMAIL`. When a `free`
  league is at/over the cap, a "⭐ League full — Request premium" `mailto:`
  button appears, prefilled: subject `Premium upgrade — {CODE} ({NAME})`, body
  with league name, code, and member count. Member count now shows `n / max`
  for free leagues.

## Deviations from Plan

1. **[Rule 2 — Missing critical] SQL lives in one migration, not the
   `apps/api/src/rpc/*.sql` paths the plan named.** Repo convention (and
   04-01/04-02/04-03) keeps Postgres functions in `supabase/migrations/`.
   Created `20260529000000_phase4_league_admin_peer.sql` with all three RPCs +
   the app_config row.
2. **[Rule 2 — Missing critical] New `get_match_predictions` RPC + new
   `PeerPredictions.tsx` component.** The plan named only PredictTab for Task 1,
   but peer predictions must come from a SECURITY DEFINER RPC (predictions RLS
   scopes reads to the owner), and a dedicated component keeps PredictTab
   manageable.
3. **[Rule 2 — Missing critical] `ADMIN_CONTACT_EMAIL` stored in app_config,
   not an API env var.** D-22 described it as an API env var, but the mailto is
   client-side; app_config (public read, already the pattern for
   LEAGUE_FREE_MAX_MEMBERS) lets the frontend read it and stays tunable.
4. **[Rule 1 — Bug] Fixed a latent `DbMatch` reference in PredictTab.**
   `getStageName` was typed `(match: DbMatch)` but only `DbMatchWithBonus` is
   imported (since 04-03). Retyped to `DbMatchWithBonus`.
5. **[Housekeeping] Added i18n keys** (`predict.peer_*`, `league.*`) to en/es
   and regenerated `packages/types/database.types.ts` for the 3 new RPCs.

**Total deviations:** 5 (3 scope additions inherent to the features, 1
auto-fixed latent bug, 1 housekeeping). **Impact:** one extra component and one
extra migration beyond the named files; no regressions.

## Verification Results

### Database
- `supabase db reset` — PASS, all 10 migrations apply + seed.
- RPC security smoke tests (simulated `auth.uid()` via `request.jwt.claims`):
  - rename as admin → succeeds; as non-admin → blocked (T-04-05) ✅
  - remove self → blocked (T-04-06); remove member as admin → row deleted ✅
  - remove as non-member → blocked ✅
  - peer before SCORED → 0 rows; after SCORED → all members ✅
  - peer as non-member → blocked ✅

### Type / lint
- `bunx tsc --noEmit` — PASS in `apps/web`, `apps/api`, `packages/types`.
- `bun run lint` — PASS in `apps/web` (2 pre-existing warnings: `SessionContext`
  and `i18n/index`, both unrelated).

### Playwright
- 4 pass / 1 fail / 12 fixme-skipped. The failure is the same pre-existing
  `auth.spec.ts:19` onboarding test (email-auth flow change on main, tracked by
  PR #29's test fix) — unrelated to this plan.

## Bugs Found and Fixed
- Latent `DbMatch` reference in `PredictTab.getStageName` (undefined since the
  04-03 import swap) — retyped to `DbMatchWithBonus`. Surfaced while editing the
  file; did not previously fail the CLI build but the IDE flagged it.

## Lessons Learned
- The seed's only ARNAVU member is a non-admin auto-user; there is no seeded
  admin. Tests that need an admin must create the membership themselves.
- `auth.uid()` resolves from `request.jwt.claims->>'sub'`, so RPC authorization
  logic can be unit-smoke-tested in psql via `set_config('request.jwt.claims',
  …, true)` without a real JWT.

## Follow-ups (not in this PR)
- `ADMIN_CONTACT_EMAIL` defaults to a placeholder (`admin@fuut.app`) — set the
  real address in prod `app_config` (or via the admin UI) before launch.
- A future admin-UI control could edit `ADMIN_CONTACT_EMAIL` like the
  reveal-lead-time field (04-02 pattern).
- Peer list shows points per member but not the bonus answer detail; could be
  expanded later if desired.

## Next Step
Phase 4 has one plan remaining: **04-05** (shareable ranking snapshots with
pixel-art PNG generation).
