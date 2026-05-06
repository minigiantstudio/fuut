---
phase: 2
slug: league-prediction-core
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.57 |
| **Config file** | `apps/web/playwright.config.ts` |
| **Quick run command** | `bunx playwright test --project=chromium` |
| **Full suite command** | `bunx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bunx playwright test --project=chromium`
- **After every plan wave:** Run `bunx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green + `bunx tsc --noEmit` passes in both apps
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | LEAGUE-02, PREDICT-01/02/03 | — | N/A | E2E | `bunx playwright test --grep "PredictTab renders after SessionContext"` (smoke stubs in multi-league.spec.ts) | ❌ W0 `multi-league.spec.ts` | ⬜ pending |
| 2-01-02 | 01 | 1 | LEAGUE-02 | — | Authenticated user sees add-league prompt, not redirect | E2E | `bunx playwright test --grep "add league"` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | LEAGUE-01 | — | "Create a league" button visible on step 1 | E2E | `bunx playwright test --grep "create league"` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | LEAGUE-01 | — | Full create flow: name → nickname → email → confirm | E2E | `bunx playwright test --grep "create league flow"` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | LEAGUE-01 | — | Confirmation screen shows invite code prominently | E2E | `bunx playwright test --grep "confirmation screen"` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | PREDICT-04 | — | "Locks in Xh Ym" appears on OPEN match < 24h away | E2E | `bunx playwright test --grep "locks in"` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | PREDICT-04 | — | No countdown label on SAVED or LOCKED rows | E2E | `bunx playwright test --grep "locks in"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/tests/league-create.spec.ts` — stubs for LEAGUE-01 create flow (all steps through confirmation)
- [ ] `apps/web/tests/multi-league.spec.ts` — stubs for LEAGUE-02 authenticated join + league switcher + PREDICT-01/02/03 SessionContext refactor smoke tests
- [ ] `apps/web/tests/predict-countdown.spec.ts` — stubs for PREDICT-04 countdown label
- [ ] Extend `apps/web/tests/helpers/mock-routes.ts` — add `create_league` RPC mock, `regenerate_invite_code` RPC mock, `leagues` REST mock, league_members array mock (for multi-league SessionContext)
- [ ] Update session mock to return `league_members` array (not single) to exercise multi-league context

*Existing infrastructure (`playwright.config.ts`, `mock-routes.ts` base) covers the test runner and Supabase mocking pattern. Only new spec files and mock extensions are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invite code UNIQUE constraint on live Supabase | LEAGUE-01, D-11 | Can't query live DB from Playwright | Check Supabase Dashboard → leagues table → Indexes before running migration |
| `create_league` RPC grants (`authenticated` role) | LEAGUE-01 | Requires live Supabase project access | After deploying RPC, call it from the app and verify it returns data (not a 403) |
| Invite code regeneration invalidates old deep links | LEAGUE-01, D-05 | Requires real URL navigation flow | Admin regenerates code; visit old `/join/:oldcode` → confirm "Invalid code" error |
| League switcher on mobile viewport | D-07 | Responsive layout requires visual inspection | Open app on mobile viewport (375px), tap league name in TopBar, verify switcher appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
