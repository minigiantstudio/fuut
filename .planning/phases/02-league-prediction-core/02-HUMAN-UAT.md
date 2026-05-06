---
status: partial
phase: 02-league-prediction-core
source: [02-VERIFICATION.md]
started: 2026-05-06T00:00:00.000Z
updated: 2026-05-06T00:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. League Switcher Interaction
expected: Tap TopBar league name with 2 memberships → dropdown lists both leagues → selecting second league updates all tabs
result: [pending]

### 2. End-to-End League Creation Flow
expected: Complete Onboarding "Create a league" path → server-generated 4-char invite code shown in large tracking-letter style → "Start predicting" navigates into app as admin
result: [pending]

### 3. Regenerate Invite Code (Admin)
expected: In LeagueTab as admin → tap Regenerate → confirm in dialog → invite code card refreshes immediately without page reload
result: [pending]

### 4. Prediction Countdown Label
expected: Open PredictTab with a match within 24h of kickoff → "Locks in Xh Ym" label appears only on open status rows; no label on saved/locked rows
result: [pending]

### 5. PREDICT-01/02/03 Regression Check
expected: Match list renders, predictions can be submitted and persist after SessionContext multi-league refactor; all prediction flows identical to pre-Phase 2
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
