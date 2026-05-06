---
phase: 02-league-prediction-core
verified: 2026-05-06T06:00:00Z
status: human_needed
score: 8/9 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navigate to / as an authenticated user with two league memberships. Tap the league name in TopBar."
    expected: "A dropdown appears listing both leagues; selecting the second league updates the displayed league name throughout the app."
    why_human: "LeagueSwitcher is only rendered when leagues.length > 1. Mock data returns 2 memberships but tests remain .fixme — no automated test exercises the switcher interaction."
  - test: "Navigate through Onboarding → Create a league → fill name → nickname → email → click Create league."
    expected: "Confirmation screen appears showing a 4-char invite code in large tracking-letter style; 'Start predicting' navigates to the main app as the new league's admin."
    why_human: "The league-create.spec.ts tests are all .fixme. The create flow touches live Supabase auth (signInAnonymously) — no automated E2E test exercises this path end-to-end."
  - test: "As an admin in LeagueTab, tap 'Regenerate invite code', confirm in the dialog."
    expected: "The invite code card in LeagueTab refreshes to show a new 4-char code immediately (no page reload required)."
    why_human: "regenerate_invite_code path has no activated E2E test; the queryClient.invalidateQueries behavior requires a live session and react-query cache to observe."
  - test: "Open PredictTab when a match has uiStatus 'open' and kickoff is less than 24 hours away."
    expected: "A 'Locks in Xh Ym' label appears below the kickoff date/time in red; this label is absent on saved/locked rows."
    why_human: "predict-countdown.spec.ts tests are all .fixme. Mock routes do not supply near-kickoff match times, so the automated test cannot trigger the countdown label."
  - test: "Verify PREDICT-01/02/03 still work after the SessionContext multi-league refactor: open PredictTab, view match list, submit a prediction, verify it persists."
    expected: "Match list renders, score inputs are interactive, prediction is saved and re-displayed on reload."
    why_human: "The PREDICT-01/02/03 smoke stubs in multi-league.spec.ts are .fixme. PredictTab has no data-testid attributes, so automated smoke test cannot target the relevant elements."
---

# Phase 2: League & Prediction Core Verification Report

**Phase Goal:** Users can create/join leagues and make predictions.
**Verified:** 2026-05-06T06:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SessionContext loads all league memberships as an array, with activeLeagueId persisted in localStorage | VERIFIED | `leagues: LeagueSummary[]` in context value; `localStorage.getItem("activeLeagueId")` read on load; `localStorage.setItem` in `setActiveLeague` — SessionContext.tsx lines 68, 102 |
| 2 | session.leagueId, session.leagueName, session.role resolve from the active league so existing consumers remain functional | VERIFIED | Index.tsx reads `session.role`, `session.leagueName` unchanged (lines 32, 46); session shape is derived from active league in loadSession(); TypeScript clean |
| 3 | Authenticated user visiting /join/:code sees "Add this league?" confirmation, not a silent redirect | VERIFIED | Join.tsx renders "Add this league?" (line 89); no `navigate(..., { replace: true })` present; old redirect pattern confirmed removed |
| 4 | Wave 0 test stubs exist for league-create, multi-league, and predict-countdown behaviors | VERIFIED | All 3 spec files exist: league-create.spec.ts (1.7K), multi-league.spec.ts (2.6K), predict-countdown.spec.ts (807B); 12 stubs skipped, 5 existing tests pass |
| 5 | User can create a league through the Onboarding flow and see the invite code on a confirmation screen | VERIFIED | Onboarding.tsx has full create-name → create-nickname → create-email → create-confirm path; invite code displayed with `text-[14px] tracking-[0.3em]` style; "Start predicting" wired to refreshSession + navigate |
| 6 | League admin can regenerate the invite code from LeagueTab with confirmation before calling the RPC | VERIFIED | LeagueTab.tsx has "Regenerate invite code" button (2 occurrences: button text + dialog heading); confirmation dialog renders; `supabase.rpc("regenerate_invite_code")` at line 73; queryClient.invalidateQueries called on success |
| 7 | TopBar league name is tappable and opens a LeagueSwitcher showing all user leagues | VERIFIED | TopBar.tsx imports LeagueSwitcher; renders it conditionally when `leagues.length > 1`; switcherOpen state toggled on button click; LeagueSwitcher calls `setActiveLeague` on selection |
| 8 | PREDICT-04: A "Locks in Xh Ym" countdown label appears on OPEN matches within 24h window, not on saved/locked/needs_result rows | VERIFIED | `getLocksInLabel()` pure function at PredictTab.tsx line 31; 24h window check on line 33; 60s setInterval tick at line 50; label rendered only inside `match.uiStatus === "open"` gate at line 234 |
| 9 | PREDICT-01/02/03: Users can view upcoming matches, submit predictions, and update predictions before kickoff (not broken by SessionContext refactor) | UNCERTAIN | PredictTab fetches matches from `supabase.from("matches")` and upserts to `supabase.from("predictions")` — implementation exists. However: no activated E2E test verifies these paths post-refactor; smoke stubs in multi-league.spec.ts are `.fixme`; PredictTab has no `data-testid` attributes required by those stubs. Needs human verification. |

**Score:** 8/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/contexts/SessionContext.tsx` | Multi-league session context with leagues[], activeLeagueId, setActiveLeague | VERIFIED | Exports LeagueSummary interface; leagues[] array state; setActiveLeague with localStorage write; loadSession returns { session, leagues } tuple |
| `apps/web/src/pages/Join.tsx` | Authenticated join-second-league confirmation screen | VERIFIED | "Add this league?" heading; league lookup via RPC; INSERT with role="member"; refreshSession on success |
| `apps/web/tests/helpers/mock-routes.ts` | Mock routes for create_league, regenerate_invite_code, leagues REST, league_members array | VERIFIED | All 4 routes present; MOCK_LEAGUE_2 exported; league_members mock returns 2 memberships |
| `apps/web/tests/league-create.spec.ts` | Wave 0 stubs for LEAGUE-01 create flow | VERIFIED | File exists; 3 .fixme tests; imports from mock-routes helper |
| `apps/web/tests/multi-league.spec.ts` | Wave 0 stubs for LEAGUE-02 + PREDICT-01/02/03 smoke tests | VERIFIED | File exists; PREDICT-01/02/03 describe block at lines 22-25; 6 .fixme tests total |
| `apps/web/tests/predict-countdown.spec.ts` | Wave 0 stubs for PREDICT-04 countdown | VERIFIED | File exists; 3 .fixme tests covering open/saved/locked row behavior |
| `supabase/migrations/20260504000001_phase2_league.sql` | UNIQUE constraint on leagues.invite_code + create_league + regenerate_invite_code RPCs | VERIFIED | File exists (3.6K); UNIQUE constraint via DO block (idempotent); create_league RPC (line 40); regenerate_invite_code RPC (line 83); both granted to authenticated role |
| `apps/web/src/components/Onboarding.tsx` | Fork at step 1: Create path + Join path; confirmation screen | VERIFIED | "Create a league" button on step 1 (line 194); create-confirm step at line 368; invite code in tracking-[0.3em] style (line 399) |
| `apps/web/src/components/LeagueSwitcher.tsx` | Dropdown listing all user leagues; calls setActiveLeague on selection | VERIFIED | New file (1.6K); reads leagues[] from useSession(); calls setActiveLeague at line 14; overlay closes on click |
| `apps/web/src/components/TopBar.tsx` | Tappable league name that opens LeagueSwitcher | VERIFIED | Imports LeagueSwitcher (line 2); renders it at line 50; conditional on leagues.length > 1 |
| `apps/web/src/components/tabs/LeagueTab.tsx` | Regenerate invite code button (admin only) with confirmation dialog | VERIFIED | `regenerate_invite_code` RPC called at line 73; button and dialog text at lines 141-155 |
| `apps/web/src/components/tabs/PredictTab.tsx` | getLocksInLabel() + 60-second tick state + countdown label in match row render | VERIFIED | getLocksInLabel at line 31; setInterval at line 50; countdown gate at line 234 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| SessionContext.tsx | Index.tsx (session consumers) | useSession() hook reads session.leagueId/leagueName/role from active league | WIRED | Index.tsx imports useSession and reads session.role (line 32), session.leagueName (line 46) |
| Join.tsx | SessionContext.tsx | reads session + calls refreshSession after adding a second league | WIRED | Join.tsx destructures { session, loading, refreshSession } from useSession(); calls refreshSession() at line 80 |
| Onboarding.tsx | supabase (create_league RPC) | supabase.rpc('create_league', { p_name }) | WIRED | Line 116-117: `supabase.rpc("create_league", { p_name: newLeagueName.trim() })` |
| TopBar.tsx | LeagueSwitcher.tsx | renders LeagueSwitcher when switcherOpen is true | WIRED | TopBar line 50: `<LeagueSwitcher open={switcherOpen} onClose={...} />` |
| LeagueTab.tsx | supabase (regenerate_invite_code RPC) | supabase.rpc('regenerate_invite_code', { p_league_id: session.leagueId }) | WIRED | LeagueTab.tsx line 73: `supabase.rpc("regenerate_invite_code", { p_league_id: session.leagueId })` |
| PredictTab.tsx getLocksInLabel | match.kickoff_at | new Date(kickoffAt).getTime() - Date.now() | WIRED | getLocksInLabel called at line 235 with `match.kickoff_at`; IIFE returns label or null |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| SessionContext.tsx | leagues[] | supabase.from("league_members").select("id, role, joined_at, leagues(id, name)") | Yes — server query with .eq("user_id", user.id) | FLOWING |
| SessionContext.tsx | session (active) | Derived from leagues[] array using localStorage activeLeagueId or leagues[0] | Yes — derived from server data | FLOWING |
| Join.tsx | leagueName, leagueId | supabase.rpc("lookup_league_by_invite_code", { p_code }) | Yes — server RPC | FLOWING |
| Onboarding.tsx | createdInviteCode | supabase.rpc("create_league", { p_name }) return value | Yes — server-generated 4-char code | FLOWING |
| LeagueSwitcher.tsx | leagues | useSession().leagues (from SessionContext) | Yes — flows from SessionContext server query | FLOWING |
| PredictTab.tsx | getLocksInLabel result | match.kickoff_at from useQuery matches | Yes — computed from server timestamp vs Date.now() | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles without errors | `bunx tsc --noEmit -p apps/web/tsconfig.json` | No output (exit 0) | PASS |
| 5 existing Playwright auth tests pass; 12 Wave 0 stubs skipped | `bunx playwright test --project=chromium` | 5 passed, 12 skipped | PASS |
| create_league RPC signature matches Onboarding call site | grep create_league in Onboarding + migration | Migration: `(p_name text)` uses auth.uid() internally; Onboarding passes only `{ p_name }` — consistent | PASS |
| regenerate_invite_code RPC call in LeagueTab matches migration signature | grep regenerate_invite_code in LeagueTab + migration | Both use `p_league_id: uuid` — consistent | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LEAGUE-01 | 02-02 | Create private league with name & invite code | SATISFIED | Onboarding fork with create path; create_league RPC in migration; confirmation screen with code |
| LEAGUE-02 | 02-01 | Join league via 4-character code or WhatsApp link | SATISFIED | Join.tsx shows "Add this league?" for authenticated users; INSERT into league_members with role=member |
| PREDICT-01 | 02-01 | View upcoming World Cup match schedule | NEEDS HUMAN | PredictTab.tsx fetches from `matches` table via useQuery; implementation existed pre-Phase 2; SessionContext refactor preserved the data flow; smoke stubs are .fixme |
| PREDICT-02 | 02-01 | Submit match score predictions | NEEDS HUMAN | PredictTab.tsx upserts to `predictions` table (lines 135, 267); implementation existed pre-Phase 2; smoke stubs are .fixme |
| PREDICT-03 | 02-01 | Update predictions before deadline | NEEDS HUMAN | PredictTab.tsx has upsert path with kickoff_at lock check; implementation existed pre-Phase 2; smoke stubs are .fixme |
| PREDICT-04 | 02-03 | Locking mechanism for predictions (countdown UX) | SATISFIED | getLocksInLabel() pure function; 60s tick; renders only on open status within 24h window |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/web/src/components/tabs/LeagueTab.tsx | 141 | "Rename league" button with no onClick handler (empty stub) | Info | Pre-existing from Phase 1; explicitly out-of-scope per CONTEXT.md (deferred to Phase 4 LEAGUE-03) |
| apps/web/tests/multi-league.spec.ts, league-create.spec.ts, predict-countdown.spec.ts | all | 12 .fixme stubs that cannot go green until data-testid attrs and near-kickoff mock data are added | Warning | Intentional Wave 0 pattern; stubs are scaffolding for future implementation, not failures |

### Human Verification Required

#### 1. League Switcher Interaction

**Test:** Sign in as a user with two league memberships. Observe the TopBar — the league name should have a "▾" chevron. Tap it.
**Expected:** A dropdown panel appears listing both leagues by name with role badges; tapping the second league updates the TopBar league name and all tab data to reflect the new active league.
**Why human:** LeagueSwitcher only renders when `leagues.length > 1`. The mock data is configured to return 2 memberships, but the multi-league.spec.ts tests covering switcher behavior are `.fixme`. No automated test exercises the switcher interaction.

#### 2. End-to-End League Creation Flow

**Test:** Navigate to the app as an unauthenticated user. Tap "Create a league" on step 1. Fill in league name, nickname, email. Tap "Create league."
**Expected:** Confirmation screen shows a server-generated 4-char invite code in large tracking-letter style. A share button is present. Tapping "Start predicting" navigates into the app as the new league's admin.
**Why human:** The league-create.spec.ts tests are all `.fixme`. The create flow calls `supabase.auth.signInAnonymously()` then `create_league` RPC — requires the live Supabase project to have the migration applied (confirmed applied per 02-02 SUMMARY) but cannot be tested in the mocked Playwright environment without removing .fixme.

#### 3. Regenerate Invite Code (Admin)

**Test:** Log in as a league admin. Open the League tab. Tap "Regenerate invite code." Confirm in the dialog.
**Expected:** The invite code card updates to a new 4-char code immediately without a page reload. The old code is no longer valid for new joins.
**Why human:** No activated E2E test covers this path. The RPC call and queryClient.invalidateQueries behavior requires a live session and React Query cache.

#### 4. Prediction Countdown Label

**Test:** Open PredictTab when at least one match has status "open" and kickoff is less than 24 hours away.
**Expected:** A "Locks in Xh Ym" label in red appears below the kickoff date/time for that row only. Rows with status saved/locked/needs_result show no such label.
**Why human:** predict-countdown.spec.ts tests are `.fixme`. The mock matches route returns no near-kickoff times, so the 24h window check never triggers in automated tests.

#### 5. PREDICT-01/02/03 Regression Check After SessionContext Refactor

**Test:** As an authenticated user in a league, open PredictTab. Verify the match list renders. Enter scores for an open match and save. Reload and confirm the prediction persists.
**Expected:** Match schedule renders; predictions can be submitted and updated; all flows work identically to pre-Phase 2 behavior.
**Why human:** The PREDICT-01/02/03 smoke stubs in multi-league.spec.ts look for `data-testid="predict-tab"`, `data-testid="match-row"`, and `data-testid="score-input-home"`, none of which exist in PredictTab.tsx. The stubs are `.fixme` and cannot be activated without adding those attributes.

### Gaps Summary

No critical gaps block goal achievement. All artifacts exist, are substantive, and are wired. The 5 human verification items above are activation gates for Wave 0 stubs — they test real behavior that exists in the codebase but has no automated coverage yet.

One notable implementation deviation was observed and is acceptable: the `create_league` RPC signature changed from the plan's spec (`(p_name text, p_user_id uuid)`) to `(p_name text)` using `auth.uid()` internally (CR-02 security fix). Both the migration and Onboarding.tsx were updated consistently, and the fix improves security by preventing privilege escalation.

The "Rename league" stub button in LeagueTab is pre-existing and deferred to Phase 4 (LEAGUE-03) per CONTEXT.md.

---

_Verified: 2026-05-06T06:00:00Z_
_Verifier: Claude (gsd-verifier)_
