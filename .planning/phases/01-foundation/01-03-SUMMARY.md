---
phase: 01-foundation
plan: 03
type: summary
status: shipped
commit: 33d799b
deployed_to: https://fuut2026-main.vercel.app
requirements: [AUTH-01, AUTH-02, AUTH-04, LEAGUE-02]
---

# Plan 01-03 Summary: Auth & Onboarding Flow

**Phase**: 01-foundation  
**Plan**: 03  
**Subsystem**: Frontend Auth + Session Management  
**Shipped**: 2026-05-01 via commit `33d799b`

---

## Overview

Plan 01-03 aimed to implement frictionless anonymous authentication and a profile-setup UI so users could enter the app with minimal friction and optionally upgrade to an email account. What shipped instead is an **invite-code-first** onboarding flow wired to an existing Supabase project (`hqixsfarkhrwfaqvnvzi`) that was already running from a parallel work stream. The scope expanded significantly beyond what the plan specified: all four main tabs (Predict, Ranking, Results, League) were also wired to real data in the same commit.

---

## Planned vs. Delivered

| Planned (01-03-PLAN) | Delivered |
|---|---|
| `apps/web/src/lib/supabase.ts` — Supabase client | `apps/web/src/lib/supabase/client.ts` — client (different path) |
| `apps/web/src/hooks/useAuth.tsx` — auth hook | `apps/web/src/contexts/SessionContext.tsx` — React context (different pattern) |
| `apps/web/src/components/Onboarding.tsx` — profile UI | `apps/web/src/components/Onboarding.tsx` — invite-code-first 4-step flow |
| `apps/web/src/components/ProfileForm.tsx` — nickname form | Not created; nickname collected inline in Onboarding step 2 |
| `supabase.auth.signInAnonymously()` triggered on mount | `signInAnonymously()` triggered only after invite-code validation + nickname entry |
| `upgradeAccount(email, password)` via `supabase.auth.updateUser()` | Email collected optionally in step 4; stored in `public.users`, no password upgrade path |
| UUID preserved across anonymous → email promotion | Not applicable; upgrade flow not implemented |

**Scope additions not in the plan:**
- `apps/web/src/lib/supabase/types.ts` — full DB type definitions
- `apps/web/src/pages/Join.tsx` + `/join/:code` route — deep-link invite handling
- `apps/web/vercel.json` — SPA rewrite rules
- Full rewire of `PredictTab`, `RankingTab`, `ResultsTab`, `LeagueTab`, `EnterResult`, `TopBar`, `AppLayout`, `StageNav`, `GroupFilter`

---

## Drift & Decisions

### DEC-004 Drift: Invite-Code-First vs. Anonymous-First

**Original DEC-004**: *"Frictionless entry allows anonymous starts, requiring account only to save first prediction."*

**What shipped**: The app opens to an invite-code entry screen. No session is created until the user:
1. Enters a valid invite code (validated against `lookup_league_by_invite_code` RPC)
2. Chooses a nickname
3. Taps "Start predicting"

Only then does `supabase.auth.signInAnonymously()` fire and a `public.users` + `league_members` row get inserted.

**Why this happened**: The Supabase project already had a multi-league schema with invite codes as the entry gate. Connecting this frontend to that project meant adopting the existing trust model — every user belongs to a specific league, and leagues are joined via invite code. Truly anonymous entry (no league context) would leave the user in a broken state with no league to predict in.

**Trade-off accepted**: Slightly higher friction at entry (code required), but cleaner data integrity (every session is associated with a league from the start). The original DEC-004 assumed a single global league; the shipped system supports multiple private leagues.

**Follow-up needed**: DEC-004 should be formally superseded in `STATE.md`. The new decision is: *"Entry requires a valid invite code; anonymous Supabase auth is used under the hood so no password is required."*

### Race Condition: Auth Row vs. DB Row

A timing issue was discovered where `onAuthStateChange` fires after `signInAnonymously()` but before the `public.users` INSERT completes. `SessionContext.loadSession()` handles this with up to 5 retries at 500 ms intervals before giving up.

### Session Pattern: Context vs. Hook

The plan specified a `useAuth` hook. What shipped is a `SessionProvider` + `useSession()` context pattern. This was chosen because the session (`userId`, `nickname`, `leagueId`, `leagueName`, `role`) needs to be available across unrelated subtrees (TopBar, all four tabs) without prop drilling.

### DB Schema: `users` not `profiles`

The plan referenced the `public.profiles` table (from the initial migration in 01-02). The existing Supabase project uses `public.users`. The frontend was wired to `public.users`; `public.profiles` is unused.

---

## Files Created

| File | Purpose |
|---|---|
| `apps/web/src/lib/supabase/client.ts` | Supabase browser client (reads `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| `apps/web/src/lib/supabase/types.ts` | TypeScript types for all DB rows + `Session` app type |
| `apps/web/src/contexts/SessionContext.tsx` | `SessionProvider`, `useSession()`, `loadSession()` with retry logic |
| `apps/web/src/pages/Join.tsx` | `/join/:code` deep-link page; pre-fills invite code, redirects if already logged in |
| `apps/web/vercel.json` | SPA catch-all rewrite (`/*` → `index.html`) |

## Files Modified

| File | Change |
|---|---|
| `apps/web/src/components/Onboarding.tsx` | Full rewrite: 4-step invite-code-first flow wired to Supabase |
| `apps/web/src/App.tsx` | Added `<SessionProvider>`, `/join/:code` route |
| `apps/web/src/pages/Index.tsx` | Replaced localStorage session with `useSession()`; passes `session` to all tabs |
| `apps/web/src/components/TopBar.tsx` | Shows real `leagueName` and user initials from session |
| `apps/web/src/components/AppLayout.tsx` | Passes `leagueName` and `nickname` props to `TopBar` |
| `apps/web/src/components/StageNav.tsx` | Accepts dynamic `stages` array + `onChange` prop (was hardcoded) |
| `apps/web/src/components/GroupFilter.tsx` | Accepts dynamic `groups` array + `onChange` prop (was hardcoded) |
| `apps/web/src/components/tabs/PredictTab.tsx` | Fully wired to Supabase: fetches matches + predictions, saves via upsert |
| `apps/web/src/components/tabs/RankingTab.tsx` | Calls `get_leaderboard` RPC; highlights current user |
| `apps/web/src/components/tabs/ResultsTab.tsx` | Fetches `is_scored` predictions joined with matches |
| `apps/web/src/components/tabs/LeagueTab.tsx` | Calls `get_league_members_with_nicknames` RPC; shows invite code + share button |
| `apps/web/src/components/EnterResult.tsx` | Updates match score in DB + invokes `score-match` Edge Function |
| `apps/web/package.json` | Added `@supabase/supabase-js`; removed `@fuut/types` workspace dep |

---

## Onboarding Flow (as built)

```
Step 1 — Invite code
  └─ validateCode() → lookup_league_by_invite_code RPC → resolves leagueId + leagueName

Step 2 — Nickname
  └─ setStep(3) on submit

Step 3 — "You're in!" confirmation
  └─ handleComplete(false) →
       signInAnonymously()
       INSERT public.users (id, nickname)
       INSERT public.league_members (user_id, league_id, role: "member")
       refreshSession() → SessionContext loads

Step 4 — Add email (optional, branched from step 2)
  └─ handleComplete(true) → same as step 3 + stores email in public.users

Recovery — "I played before"
  └─ signInWithOtp({ email }) → magic link sent
```

---

## Tests

| Test | Framework | Status | Notes |
|---|---|---|---|
| `src/test/example.test.ts` | Vitest | ✅ Passes | Placeholder only (`expect(true).toBe(true)`) |
| `landing page shows invite-code entry` | Playwright | ✅ Passes | Pure UI — no Supabase call |
| `invalid invite code surfaces an error` | Playwright | ✅ Passes | Mock returns `[]` for non-`TEST1` code |
| `valid invite code advances to nickname step` | Playwright | ✅ Passes | Mock returns `[MOCK_LEAGUE]` for `"TEST1"` — exercises the full happy-path branch |
| `"I played before" reveals the recovery flow` | Playwright | ✅ Passes | Pure UI |
| `no spurious session on first visit` | Playwright | ✅ Passes | Checks localStorage is empty after reload |
| `useSession` unit tests | Vitest | ❌ Not written | SessionContext has no unit tests |
| `loadSession` retry logic | Vitest | ❌ Not written | Race condition fix is untested |

All 5 Playwright tests run against `page.route()` network mocks (see `apps/web/tests/helpers/mock-routes.ts`) — no production Supabase is hit. The `validateCode` bug (invalid code silently advancing onboarding) was fixed in plan 01-04 and the previously-skipped `test.fixme` is now a passing test.

---

## Supabase RPCs Required

These must exist on the connected Supabase project for the flow to work:

| RPC | Called from | Purpose |
|---|---|---|
| `lookup_league_by_invite_code(p_code)` | `Onboarding.validateCode()` | Validate code, return `{ id, name }` — granted to `anon` role |
| `get_leaderboard(p_league_id)` | `RankingTab` | Returns ranked members with `rank_delta` |
| `get_league_members_with_nicknames(p_league_id)` | `LeagueTab` | Returns flat member list bypassing `users` RLS |
| `score-match` Edge Function | `EnterResult` | Scores predictions, updates leaderboard snapshots |

---

## Known Gaps & Follow-ups

| # | Gap | Severity | Suggested fix |
|---|---|---|---|
| 1 | **No account promotion** — email collected but stored in `public.users`, not linked to Supabase Auth; `supabase.auth.updateUser()` not implemented | High | Implement email OTP upgrade flow in a follow-up plan |
| 2 | **Race condition is retry-based, not bulletproof** — if the DB insert takes > 2.5 s (5 × 500 ms), the user lands on a blank screen | Medium | Use a server-side trigger or webhook to confirm insert before returning |
| 3 | ~~**No E2E test for onboarding**~~ | ~~Medium~~ | ✅ **Resolved** — 5 Playwright tests covering the onboarding flow, all using `page.route()` mocks (plan 01-04 + follow-up) |
| 4 | **`public.profiles` table unused** — 01-02 migration creates it; 01-03 ignores it in favour of `public.users` | Low | Either drop the table or reconcile in a migration |
| 5 | **DEC-004 not updated in STATE.md** | Low | Update `STATE.md` to reflect invite-code-first as the canonical entry pattern |
| 6 | **Single league per user** — `SessionContext` takes the first `league_members` row; multi-league users not supported | Low | Out of scope for v1; document as known limitation |
| 7 | ~~**`@fuut/types` package still in monorepo**~~ | ~~Low~~ | ✅ **Resolved** — `@fuut/types` restored as a proper workspace package with generated `Database` types from `supabase gen types`; `apps/api` uses `createClient<Database>()` (commit `3e8573c`) |

---

## Self-Check

- [x] Supabase client initialises correctly from env vars
- [x] Anonymous sign-in fires only after code + nickname (not on mount)
- [x] Session persists across page refresh (Supabase manages the JWT in localStorage)
- [x] Logout clears session via `supabase.auth.signOut()`
- [x] `/join/:code` pre-fills invite code and redirects authenticated users to `/`
- [x] All four tabs receive `session` prop and fetch real data
- [x] Build passes (`vite build` — no TypeScript errors)
- [x] Deployed to `https://fuut2026-main.vercel.app` with correct env vars
- [ ] Email upgrade path implemented
- [x] E2E tests written — 5 Playwright tests passing via `page.route()` mocks
- [x] `@fuut/types` re-integrated with generated `Database` types
- [ ] DEC-004 updated in STATE.md
