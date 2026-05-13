---
phase: 03-scoring-real-time-rankings
plan: 03
status: complete
wave: 2
subsystem: admin
tags: [admin, security, manual-override, scoring, frontend]
depends_on: ["03-01", "03-02"]
provides: ["global-admin-dashboard", "admin-scoring-api"]
affects: ["scoring-engine", "leaderboard", "session-context"]
tech_stack:
  added: []
  patterns: ["requireGlobalAdmin middleware", "DB-backed authorization", "fetch with bearer token"]
key_files:
  created:
    - apps/api/src/routes/admin.ts
    - apps/web/src/pages/Admin.tsx
    - apps/api/.eslintrc.cjs
  modified:
    - apps/api/src/index.ts
    - apps/web/src/App.tsx
    - apps/web/src/contexts/SessionContext.tsx
    - apps/web/src/lib/supabase/types.ts
    - apps/web/src/components/Onboarding.tsx
decisions:
  - "Admin authorization uses DB lookup of is_global_admin (not client header) to mitigate T-03-04 elevation-of-privilege"
  - "Session type extended with isGlobalAdmin boolean fetched at login bootstrap"
  - "Admin page performs client-side redirect for non-admins as defense-in-depth (backend enforcement is primary)"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-12"
  tasks_completed: 2
  files_changed: 9
---

# Phase 03 Plan 03: Global Admin Dashboard Summary

## One-Liner

Secure `/admin` dashboard for manual match score overrides — DB-backed `is_global_admin` guard on both backend and frontend, triggers ScoringService re-scoring on finalize.

## Objective

Create a fallback mechanism for match results. The Global Admin Dashboard allows manual entry of scores and bonus results, ensuring the game continues even if the external Football-Data API fails.

## Work Completed

### Task 1: Admin Scoring Backend Routes

- **Created `apps/api/src/routes/admin.ts`**:
  - `requireGlobalAdmin` middleware: queries `users.is_global_admin` from Supabase using `req.user.id` — never trusts any client-provided header (mitigates STRIDE T-03-04 elevation-of-privilege)
  - `POST /api/admin/match-result`: validates `matchId` (string), `homeScore` (non-negative integer), `awayScore` (non-negative integer), `bonusResult` (boolean) — returns 400 on invalid input
  - Updates `matches` row: `home_score`, `away_score`, `bonus_result`, `is_final: true`, `is_manual_override: true`
  - Calls `ScoringService.scoreMatch(matchId)` which internally calls `recalculateLeaderboard()` for all affected leagues
- **Modified `apps/api/src/index.ts`**: mounted `adminRouter` at `/api/admin` behind `authMiddleware + requireGlobalAdmin` middleware chain

### Task 2: Admin Dashboard UI

- **Created `apps/web/src/pages/Admin.tsx`**:
  - Retro 8-bit aesthetic matching existing pages (pixel-border, Press Start 2P sizing, pixel-green/pixel-red colors)
  - Lists all matches split into "Pending" and "Finalized" sections
  - Score inputs (home/away) with number validation
  - Bonus result Yes/No toggle buttons — shows bonus question text if present
  - "Finalize Result" button: fetches Supabase access token, POSTs to `${VITE_API_URL}/api/admin/match-result` with bearer auth
  - Per-match loading/error/success feedback states
  - Guard: reads `isGlobalAdmin` from `SessionContext`, redirects non-admins to `/` on mount
- **Modified `apps/web/src/App.tsx`**: added `<Route path="/admin" element={<AdminPage />} />`
- **Modified `apps/web/src/contexts/SessionContext.tsx`**: extended `loadSession()` to select `is_global_admin` from users table and populate `session.isGlobalAdmin`
- **Modified `apps/web/src/lib/supabase/types.ts`**: added `isGlobalAdmin: boolean` to `Session` interface

## Verification Results

- `bunx tsc --noEmit` (apps/api): PASSED
- `bunx tsc --noEmit` (apps/web): PASSED
- `bun run lint` (apps/api): PASSED (0 errors, 0 warnings)
- `bun run lint` (apps/web): PASSED (0 errors, 1 pre-existing warning in SessionContext.tsx about react-refresh — not caused by this plan)
- `grep "adminRouter" apps/api/src/index.ts`: MATCHED (2 hits — import + mount)
- `ls apps/web/src/pages/Admin.tsx`: EXISTS

## Threat Model Compliance

| Threat ID | Category | Mitigation Applied |
|-----------|----------|--------------------|
| T-03-04 | Elevation of Privilege | `requireGlobalAdmin` middleware queries `users.is_global_admin` from DB using authenticated user ID. Client headers are never trusted. Backend is primary enforcement; frontend redirect is defense-in-depth. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing dependencies prevented tsc from compiling**
- **Found during:** Task 1 verification
- **Issue:** `node_modules` in `apps/api` did not exist (packages not installed in local env). `bunx tsc --noEmit` failed with "Cannot find module 'node-cron'" and "Cannot find module 'axios'" — pre-existing from plan 03-02.
- **Fix:** Ran `bun install` from workspace root to install all dependencies.
- **Files modified:** `bun.lock` (updated)

**2. [Rule 3 - Blocking] Missing ESLint config in apps/api**
- **Found during:** Task 2 verification (lint step)
- **Issue:** `apps/api` had no ESLint config file — `bun run lint` failed with "ESLint couldn't find a configuration file". Pre-existing issue.
- **Fix:** Created `apps/api/.eslintrc.cjs` with TypeScript-compatible config matching project conventions.
- **Files modified:** `apps/api/.eslintrc.cjs`

**3. [Rule 1 - Bug] Pre-existing lint error in Onboarding.tsx**
- **Found during:** Task 2 lint check
- **Issue:** `no-extra-boolean-cast` error on line 65 — `!!data` used redundantly after `setIsRegistered(!!data)` already coerced the value.
- **Fix:** Extracted to `const emailExists = !!data` and used that variable in both calls.
- **Files modified:** `apps/web/src/components/Onboarding.tsx`

## Known Stubs

None — all functionality is wired to real data sources.

## Self-Check: PASSED

- `apps/api/src/routes/admin.ts`: EXISTS
- `apps/web/src/pages/Admin.tsx`: EXISTS
- `apps/api/src/index.ts` contains `adminRouter`: CONFIRMED
- Commit `1b1d424`: EXISTS (Task 1)
- Commit `215b272`: EXISTS (Task 2)
- tsc clean (both apps): CONFIRMED
- lint clean (both apps): CONFIRMED
