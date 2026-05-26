---
phase: 04-social-bonus-predictions
plan: 02
status: complete
wave: 1
---

# Summary - Plan 04-02 (Global Admin controls + free-tier cap enforcement)

## Objective
Enforce the free-tier league member cap server-side (no client can bypass it),
and give the Global Admin a UI for editing the bonus-reveal lead time and
flipping league tiers between `free` and `premium`.

## Scope Notes
The plan as written referenced "Update Join RPC" + a file path
`apps/api/src/rpc/join_league_by_code.sql`, but:
- No `join_league_by_code` RPC existed — `Onboarding.tsx` did a direct
  `supabase.from("league_members").insert(...)`.
- The repo convention puts Postgres functions inside migrations (alongside
  `create_league`, `lookup_league_by_invite_code`, `regenerate_invite_code`),
  not in standalone SQL files.

Both deviations followed the repo's existing patterns rather than the plan's
literal text. See "Files modified" below.

## Work Completed

### 1. Cap-enforced join RPC
- **File**: `supabase/migrations/20260526150000_phase4_join_rpc.sql`
- `CREATE OR REPLACE FUNCTION public.join_league_by_code(p_code text) RETURNS TABLE (league_id uuid, league_name text, member_role text)`
- `SECURITY DEFINER` so the function can read `app_config` / `leagues` /
  `league_members` regardless of caller RLS.
- `SET search_path = public` to prevent schema-shadowing attacks against the
  service-role context.
- Steps:
  1. `auth.uid()` null check → `RAISE 'NOT_AUTHENTICATED'`
  2. Lookup league by `upper(trim(invite_code))` → `RAISE 'INVALID_CODE'`
  3. Idempotent re-join: if (user_id, league_id) row exists, return existing
     role and exit — `league_members` has no unique constraint on that pair,
     so this guards against duplicate rows.
  4. If `tier = 'free'`, read `LEAGUE_FREE_MAX_MEMBERS` from `app_config`
     (default 10), count current members, `RAISE 'LEAGUE_FULL'` if at cap.
  5. Insert membership with role `'member'`.
- Grants: `REVOKE ALL FROM PUBLIC`, `REVOKE EXECUTE FROM anon`,
  `GRANT EXECUTE TO authenticated`. Defense in depth — Supabase's default
  schema grant adds `anon` execute; we explicitly remove it.

### 2. Web join flow swapped to RPC
- **File**: `apps/web/src/components/Onboarding.tsx`
- `handleComplete()`: replaced `supabase.from("league_members").insert(...)`
  with `supabase.rpc("join_league_by_code", { p_code })`.
- Error mapping: `LEAGUE_FULL` → "This league is full. Ask the admin to
  upgrade.", `INVALID_CODE` → "Invalid code. Ask your admin.", existing
  nickname-conflict message preserved.
- Upsert of `users` row (nickname + email) still happens **before** the RPC
  call, so the user record exists when the RPC inserts `league_members`.

### 3. Admin API — 4 new endpoints
- **File**: `apps/api/src/routes/admin.ts`
- All mounted under `/api/admin/*` behind the existing `requireAdminToken`
  middleware (DEC-018, HMAC JWT). No middleware changes needed.
- `GET /api/admin/app-config` — returns `{ config: { [key]: value } }`
- `PATCH /api/admin/app-config/:key` — body `{ value: number }`, validated:
  only `bonus_reveal_lead_minutes` and `LEAGUE_FREE_MAX_MEMBERS` are
  writable; value must be a positive integer.
- `GET /api/admin/leagues` — returns leagues with computed `member_count`
  (two queries + in-memory join — fine for current scale).
- `POST /api/admin/leagues/:id/tier` — body `{ tier: 'free' | 'premium' }`,
  validated. Uses `supabaseAdmin` (service role) so it bypasses the leagues
  table's lack of an UPDATE policy (threat T-04-02 mitigation: no public
  UPDATE policy + service-role-only write).

### 4. Admin client + UI sections
- **File**: `apps/web/src/admin/adminClient.ts`
- Added `getAppConfig`, `updateAppConfigKey`, `listLeagues`, `setLeagueTier`,
  plus `AppConfig` + `AdminLeague` types.
- **File**: `apps/web/src/admin/AdminDashboard.tsx`
- Added two new sections above "Pending Matches":
  - **Global Settings** card — `bonus_reveal_lead_minutes` number input + Save
  - **Leagues** list — name, invite code, member count (with `/ max` and
    "(full)" suffix on free-tier-at-cap leagues), tier badge, Flip-to-Premium
    / Revert-to-Free button.
- All optimistic UI updates with rollback on error; 401 → redirect to
  `/admin/login` (matches existing `handleFinalize` pattern).

## Verification Results

### Database
- `supabase db reset` — PASS, all 9 migrations apply cleanly.
- Smoke tests (psql with faked `request.jwt.claims`):
  - Happy path: Saul joins ARNAVU → returns `(ARNAVU, member)`, row inserted ✅
  - Idempotent re-join: pre-existing admin role returned, no new row ✅
  - `LEAGUE_FULL` raised when `LEAGUE_FREE_MAX_MEMBERS = 0` ✅
  - `INVALID_CODE` raised for unknown code 'ZZZZ' ✅
  - `anon` role has no EXECUTE grant ✅
  - `authenticated` role has EXECUTE grant ✅

### Type/lint
- `bunx tsc --noEmit` — PASS in `apps/web`, `apps/api`.
- `bun run lint` — PASS in `apps/web` (one pre-existing `react-refresh` warning
  in `SessionContext.tsx` unrelated to this PR) and `apps/api`.

### Playwright
- 4 pass / 1 fail / 12 fixme-skipped.
- The failure is the same pre-existing `tests/auth.spec.ts:24` bug from
  `main`, addressed by PR #29 (`fix/playwright-local-e2e`). When #29 merges
  and `phase-04-02` is rebased onto `main`, all 5 active tests pass.

## Bugs Found and Fixed
- None new. The 04-02 work integrated cleanly on top of 04-01.

## Lessons Learned
- `REVOKE ... FROM PUBLIC` does **not** revoke explicit grants to named roles
  (like `anon`). Have to `REVOKE EXECUTE FROM anon` separately. Supabase's
  default schema-level grants give `anon` execute on functions in `public`,
  so this matters for any RPC that should be authenticated-only.
- Postgres jsonb-to-int extraction: `(value::text)::int` works because
  `'60'::jsonb::text` returns `'60'`. `value->>''` doesn't work for scalars.
- `\\df+` in psql shows access privileges as `role=privs/grantor`. Without an
  entry, the role has no grant — easy to verify revokes worked.

## Follow-ups (out of scope)
- The "Request Premium" mailto button in `LeagueTab.tsx` (Plan 04-04) will
  read from the same `LEAGUE_FULL` signal — already in place once 04-02 lands.
- Once 04-03 starts redacting bonus questions server-side, the admin "Save"
  on `bonus_reveal_lead_minutes` will be exercised end-to-end. For now the
  value is stored but no UI reads it (the existing fallback list in
  `BonusPrediction.tsx` is unconditional).
- Consider adding a database trigger on `league_members` INSERT as
  defense-in-depth, so even direct table inserts (e.g., service-role) respect
  the cap. Skipped to keep this PR focused — service-role writes happen
  rarely and are by definition trusted.

## Next Step
Proceed to **Plan 04-03: Bonus question reveal + live scoring toasts**.
