---
phase: 03-scoring-real-time-rankings
plan: 03
status: complete
wave: 2
subsystem: admin
tags: [admin, security, manual-override, scoring, frontend]
depends_on: ["03-01", "03-02"]
provides: ["global-admin-dashboard", "admin-scoring-api"]
affects: ["scoring-engine", "leaderboard"]
tech_stack:
  added: ["bcrypt", "jsonwebtoken"]
  patterns:
    - "env-var admin auth"
    - "HMAC-signed JWT (HS256)"
    - "supabaseAdmin (service-role) client for RLS-bypassing writes"
    - "isolated admin subtree at apps/web/src/admin/"
key_files:
  created:
    - apps/api/src/middleware/admin-token.ts
    - apps/api/src/routes/admin-auth.ts
    - apps/web/src/admin/adminClient.ts
    - apps/web/src/admin/AdminLogin.tsx
    - apps/web/src/admin/AdminDashboard.tsx
    - apps/api/.eslintrc.cjs
    - supabase/migrations/20260513045937_drop_is_global_admin.sql
    - supabase/templates/magic_link.html
    - supabase/templates/recovery.html
    - supabase/templates/confirmation.html
  modified:
    - apps/api/src/routes/admin.ts
    - apps/api/src/index.ts
    - apps/api/.env.example
    - apps/api/package.json
    - apps/web/src/App.tsx
    - apps/web/src/contexts/SessionContext.tsx
    - apps/web/src/lib/supabase/types.ts
    - packages/types/src/database.types.ts
    - supabase/config.toml
decisions:
  - "DEC-018 (supersedes DEC-016/017): admin uses env-var creds + HMAC JWT, not DB-flag"
  - "Admin lives in isolated subtree apps/web/src/admin/ (not a separate workspace) — internal-tool audience doesn't justify infra cost"
  - "Server uses a second supabaseAdmin client with service_role to bypass RLS for admin overrides + scoring writes"
  - "Pre-existing magic-link recovery flow kept untouched — admin auth is separate"
metrics:
  duration: "~5 hours including pivot"
  completed: "2026-05-13"
  tasks_completed: 3
  files_changed: 21
---

# Phase 03 Plan 03: Admin Override (env-var + HMAC JWT)

## One-Liner

Admin can sign into an isolated `/admin/login` + `/admin` subtree with env-var-configured email/password, get an 8h HMAC-signed JWT, and finalize match results — triggering ScoringService re-scoring and leaderboard recalculation. No DB flag, no Supabase Auth coupling.

## Objective

Provide a fallback path for match results when the Football-Data API is unavailable or wrong. Originally implemented per DEC-016/017 (DB-flag admin), then pivoted on 2026-05-13 to the env-var branch of D-08 (DEC-018) after team review.

## Pivot history

| Phase | What shipped | Then |
|---|---|---|
| Initial pass (commits `1b1d424` → `c2b0521`) | DB-flag admin: migration added `users.is_global_admin`, backend `requireGlobalAdmin` middleware did a DB lookup per request, frontend redirect via `session.isGlobalAdmin`. UAT showed the auth gate worked (non-admin redirected; admin can land on /admin). | Team picked the env-var branch of D-08. DB-flag and the SessionContext extension were torn out. |
| Pivot (commits `8b41c29` → onwards) | DEC-018 architecture: `/api/admin/login` + HMAC JWT, admin subtree in `apps/web/src/admin/`, service-role client for the matches UPDATE. The original DB column is dropped by migration `20260513045937_drop_is_global_admin.sql`. | UAT end-to-end (browser → finalize → DB row + scoring) confirmed. |

## Work Completed

### Task 1 — Admin auth backend

- `apps/api/src/middleware/admin-token.ts` — `requireAdminToken` verifies HS256 Bearer JWT against `ADMIN_JWT_SECRET`, requires `sub === 'admin'`.
- `apps/api/src/routes/admin-auth.ts` — `POST /api/admin/login` checks `email === ADMIN_EMAIL` and `bcrypt.compare(password, ADMIN_PASSWORD_HASH)`, issues a JWT with 8h expiry on success.
- `apps/api/src/routes/admin.ts` rewritten — uses the new `supabaseAdmin` (service-role) client, chains `.select()` on the UPDATE so 0-rows-affected returns 404, constructs `ScoringService` with the admin client so prediction/leaderboard writes also bypass RLS.
- `apps/api/src/index.ts`:
  - Exports a second `supabaseAdmin` client built from `SUPABASE_SERVICE_ROLE_KEY` (warns if missing).
  - Mounts `adminAuthRouter` first (public `/login`), then `adminRouter` behind `requireAdminToken`.
- `apps/api/.env.example` — documents `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (bcrypt), `ADMIN_JWT_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` with generation commands.
- `apps/api/package.json` — adds `bcrypt`, `jsonwebtoken` + `@types/*`.

### Task 2 — Admin subtree in `apps/web/src/admin/`

- `adminClient.ts` — fetch helper layer. Stores `{token, expiresAt}` in localStorage under `fuut.adminToken*`. Exposes `adminLogin`, `adminLogout`, `getAdminToken`, `adminFetch` (auto-clears token on 401), `adminFinalizeMatch`.
- `AdminLogin.tsx` — retro 8-bit email+password form. Skips itself if a live token already exists.
- `AdminDashboard.tsx` — port of the original Admin.tsx UI (pending/finalized match split, score inputs, bonus toggle, finalize button) but auth-gated by `getAdminToken()` instead of `SessionContext`. Adds a sign-out button.
- `apps/web/src/App.tsx` — routes `/admin/login` and `/admin` registered. No `SessionContext` coupling for admin views.

### Task 3 — Revert the original DB-flag implementation

- Migration `20260513045937_drop_is_global_admin.sql` drops the column.
- `packages/types/src/database.types.ts` regenerated from local schema (no `is_global_admin`).
- `apps/web/src/contexts/SessionContext.tsx` — drops the column from the users SELECT and drops `isGlobalAdmin` from the returned session.
- `Session` interface in `apps/web/src/lib/supabase/types.ts` no longer carries `isGlobalAdmin`.
- Old `apps/web/src/pages/Admin.tsx` removed.

## Verification Results

- `bunx tsc --noEmit` (apps/api) — PASSED
- `bunx tsc --noEmit` (apps/web) — PASSED
- `bun run lint` (apps/api) — PASSED
- `bun run lint` (apps/web) — PASSED (1 pre-existing react-refresh warning in `SessionContext.tsx`, unrelated to this plan)
- `bun --bun vitest run` (apps/web) — PASSED (1/1)
- `bunx playwright test` (apps/web) — 4 passed / 1 pre-existing failure / 12 skipped (the failing test, `auth.spec.ts:19`, also fails on the pre-execution baseline — not a regression)
- `grep -r "is_global_admin\|isGlobalAdmin" apps/web/src/ packages/types/src/` — 0 matches (revert clean)
- `grep "adminAuthRouter\|requireAdminToken" apps/api/src/index.ts` — both matched
- End-to-end UAT (browser): login at `/admin/login` with `admin@fuut.local`/`admin123` → land on `/admin` → finalize Mexico vs South Africa with `2-2, bonus=Yes` → DB row updated with `is_final=true, is_manual_override=true` → confirmed via psql

## Threat Model Compliance

| Threat ID | Category | Mitigation |
|---|---|---|
| T-03-04 | Elevation of Privilege | `requireAdminToken` verifies HS256 JWT; payload must have `sub === 'admin'`. Token only issued after `bcrypt.compare` against env-var hash. No DB consulted — no stale/wrong-flag elevation risk. |
| T-03-04b | Tampering | HS256 signature with server-known secret. Tampered JWTs rejected by `jwt.verify`. |
| T-03-04c | Information Disclosure | `.env` gitignored locally; `.env.example` has placeholders only. Password is bcrypt-hashed, never plaintext. |
| T-03-04d | Repudiation | Accepted risk for v1 — single shared admin identity, no per-action audit log. Revisit when admin team grows beyond one. |

## Deviations from Plan

### Architectural pivot

The plan started against DEC-016/017 (DB-flag) and was rewritten mid-execution against DEC-018 (env-var + dedicated subtree). See the "Pivot history" section above. STATE.md has the formal supersession.

### Auto-fixed during execution

1. **TDZ bug in admin.ts** (`ce504c3`) — `new ScoringService(supabase)` at module load time read an uninitialized binding because admin.ts is imported before `export const supabase = createClient(...)` runs in index.ts. Moved instantiation inside the request handler.
2. **Missing VITE_API_URL fallback in Admin.tsx** (`32b2fec`) — original Admin.tsx hardcoded `import.meta.env.VITE_API_URL as string` with no fallback. Aligned with the `useApi.ts` pattern (`?? "http://localhost:3001"`). Now lives in `adminClient.ts::apiUrl()`.
3. **RLS silently dropping admin UPDATEs** — the anon-key supabase client was silently affecting 0 rows on the matches UPDATE. Added a service-role `supabaseAdmin` client and chained `.select()` on the update to surface 0-rows as a 404.
4. **Pre-existing tooling issues** — created `apps/api/.eslintrc.cjs` (was missing), fixed `no-extra-boolean-cast` in `Onboarding.tsx`, ran `bun install` (node_modules was absent), regenerated `database.types.ts`.

### Dev-infrastructure changes (out-of-scope but committed alongside)

While unblocking local UAT, two pre-existing Supabase CLI quirks were fixed:

- `supabase/config.toml::site_url` was `http://127.0.0.1:3000` but Vite defaults to 8080. Updated `site_url` + widened `additional_redirect_urls`.
- GoTrue's default email templates point at `…:54321/verify` (missing `/auth/v1` prefix from `API_EXTERNAL_URL`). Custom templates added at `supabase/templates/{magic_link,recovery,confirmation}.html` that build the URL with `/auth/v1/verify` explicitly.

These affect the normal-user "I played before" recovery flow — admin login uses env-var creds and is unaffected by the template work.

## Known Stubs / Deferred

- **Per-action admin audit log** — accepted as repudiation risk T-03-04d for v1.
- **Admin password rotation UX** — not built. Operator updates `.env` and restarts.
- **Multi-admin support** — current design is single shared identity. If multiple admins are added later, swap env-var auth for a small admins table + bcrypt-hashed rows.

## Self-Check: PASSED

- `apps/web/src/admin/AdminLogin.tsx`: EXISTS
- `apps/web/src/admin/AdminDashboard.tsx`: EXISTS
- `apps/api/src/middleware/admin-token.ts`: EXISTS
- `apps/api/src/routes/admin-auth.ts`: EXISTS
- `apps/api/src/index.ts` mounts `adminAuthRouter` and `requireAdminToken + adminRouter`: CONFIRMED
- `grep "is_global_admin\|isGlobalAdmin" apps/web/src packages/types/src`: 0 matches
- End-to-end UAT (browser → finalize Mexico vs South Africa): DB row reflects `is_final=true, is_manual_override=true, home_score=2, away_score=2, bonus_result=true`
- tsc clean (apps/api, apps/web): CONFIRMED
- lint clean (apps/api, apps/web): CONFIRMED
