---
phase: 03-scoring-real-time-rankings
plan: 04
status: complete
wave: 3
subsystem: frontend
tags: [bonus-predictions, realtime, frontend, react-query, supabase-channel]
depends_on: ["03-01", "03-02", "03-03"]
provides: ["bonus-prediction-persistence", "realtime-leaderboard"]
affects: ["predict-tab", "ranking-tab"]
tech_stack:
  added: []
  patterns:
    - "Supabase Realtime channel namespaced per league"
    - "React Query invalidation as CDC sink"
    - "Optimistic local UI state with parent prop re-sync"
    - "Booleans end-to-end for bonus_answer (no string ↔ bool mapping)"
key_files:
  created:
    - .planning/phases/03-scoring-real-time-rankings/03-04-SUMMARY.md
  modified:
    - apps/web/src/components/BonusPrediction.tsx
    - apps/web/src/components/tabs/PredictTab.tsx
    - apps/web/src/components/tabs/RankingTab.tsx
    - apps/web/src/lib/supabase/types.ts
    - apps/web/src/contexts/SessionContext.tsx
decisions:
  - "BonusPrediction uses booleans throughout (matches DB column type); no 'yes'/'no' string layer"
  - "Bonus button disabled until home_score and away_score are set (predictions NOT NULL constraint), in addition to the kickoff lock"
  - "Realtime channel name is namespaced per league (leaderboard-<leagueId>) to prevent cross-league bleed"
  - "Fallback question uses char-sum hash of matchId (UUIDs broke the prior parseInt-based lookup)"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-17"
  tasks_completed: 2
  files_changed: 5
---

# Phase 03 Plan 04: Functional Bonus Predictions & Real-time Leaderboard

## One-Liner

Bonus predictions now persist to `predictions.bonus_answer` and lock at kickoff,
and the leaderboard re-renders instantly when `leaderboard_snapshots` changes
via a per-league `supabase.channel` subscription that invalidates the
`get_leaderboard` React Query.

## Objective

Connect the prototype `BonusPrediction` component to Supabase so answers are
durable, and wire `RankingTab` to Supabase Realtime so points pushed by the
scoring engine surface without manual refresh. Both pieces close the loop on
SCORE-03 ("Update leaderboards in real-time") and D-09 ("PredictTab Integration").

## Work Completed

### Task 1 — Functional bonus predictions (`09113c4`)

**`apps/web/src/components/BonusPrediction.tsx`**

- Props expanded to `{ matchId, bonusQuestion, initialAnswer, onSave, disabled }`.
- Dropped the internal `useState<"yes"|"no"|null>` — the answer is now a
  `boolean | null` driven by `initialAnswer` from the parent, with an
  optimistic local mirror so clicks feel snappy while the upsert flies.
- `useEffect` re-seeds the optimistic copy whenever `initialAnswer` changes
  (e.g. after React Query invalidation), so external mutations are reflected.
- Yes/No buttons map to `true`/`false`; visual selection driven by the
  optimistic boolean (`null` → unanswered, `true` → green Yes, `false` → red No).
- `onSave` errors trigger an optimistic rollback so the UI matches the DB.
- Fallback question uses a deterministic char-sum hash of `matchId` instead of
  `parseInt(matchId)`. Match IDs are UUIDs, so the prior lookup always produced
  `NaN` and rendered an `undefined` question. Tracked as a Rule 1 bug fix.

**`apps/web/src/components/tabs/PredictTab.tsx`**

- New `handleBonusSave(matchId, answer)` upsert that preserves the existing
  `home_score` / `away_score` on the row.
- `handleScoreChange` and the `MatchDetail.onSave` upserts now both pass
  through `bonus_answer: existing?.bonus_answer ?? null` so writing scores
  after a bonus answer does not erase the answer.
- `<BonusPrediction>` JSX now passes `bonusQuestion={match.bonus_question}`,
  `initialAnswer={match.prediction?.bonus_answer ?? null}`,
  `disabled={isLocked || !scores-set}`, and `onSave={handleBonusSave}`.

**`apps/web/src/lib/supabase/types.ts`**

- `DbMatch` gains `bonus_question: string | null`.
- `DbPrediction` gains `bonus_answer: boolean | null`.

### Task 2 — Realtime leaderboard (`1446007`)

**`apps/web/src/components/tabs/RankingTab.tsx`**

- Adds `useEffect` + `useQueryClient` imports.
- Subscribes to a per-league channel (`leaderboard-<leagueId>`) with two
  `postgres_changes` handlers (INSERT and UPDATE) filtered to
  `schema=public, table=leaderboard_snapshots, league_id=eq.<id>`.
- On any event, calls
  `queryClient.invalidateQueries({ queryKey: ["leaderboard", session.leagueId] })`
  so the `get_leaderboard` RPC re-runs and the UI re-renders with fresh
  `total_points` and `rank_delta`.
- Cleanup calls `supabase.removeChannel(channel)` on unmount or `leagueId` change.

## Schema / Typing Decisions

| Question | Choice | Why |
|---|---|---|
| String vs. boolean for the answer in the UI | **Boolean end-to-end** | `predictions.bonus_answer` is `boolean | null` in the schema. Mapping `"yes"/"no"` ↔ `true/false` at a single boundary adds noise for zero benefit when the component is brand-new. Cleaner contract, fewer footguns. |
| Allow saving a bonus before scores? | **No — bonus disabled until scores set** | `predictions.home_score` and `predictions.away_score` are `NOT NULL` (`20260401000000_init_schema.sql:68-69`); the phase-3 migration never relaxed them. A bonus-only upsert would 23502 the FK. The UI disables the bonus toggle when either score is null, and `handleBonusSave` has a defensive `console.warn` + early-return as a belt-and-braces guard. |
| Channel scoping | **Per-league channel name** | Sharing one `leaderboard` channel across mounts (e.g. multiple browser tabs of different leagues) would either drop events or fan them out incorrectly. `leaderboard-<leagueId>` is unique per subscription and cleanly torn down on `leagueId` change. |
| Fallback question hashing | **Char-sum % length** | `parseInt(<uuid>)` returns `NaN`. Char-sum is deterministic, stable across reloads, distributes UUIDs evenly enough for a 10-element table, and is one line. |

## Bugs Found and Fixed

1. **`BonusPrediction` was rendering `undefined` for the fallback question**
   — `BONUS_QUESTIONS[parseInt(uuid) % 10]` evaluates to `undefined`. Replaced
   with a char-sum hash so any string id maps to a slot. Rule 1.
2. **Score upserts could wipe an existing bonus answer** — neither of the two
   prior upsert sites (`handleScoreChange`, `MatchDetail.onSave`) passed
   `bonus_answer`, so an upsert after a bonus had been saved would reset it
   to NULL. Both now pass through `existing?.bonus_answer ?? null`. Rule 1.
3. **`SessionContext` deadlock on tab visibility change** — surfaced during
   manual UAT of the realtime subscription, but the root cause is pre-existing:
   the `onAuthStateChange` callback called `loadSession()` which calls
   `supabase.auth.getSession()` from inside Supabase's auth lock, deadlocking
   `_recoverAndRefresh` against the subscriber. The 5-second `getSession`
   timeout then triggered the destructive recovery path
   (`clearStaleSupabaseTokens` + `window.location.reload`), silently logging
   the player out whenever the tab regained focus. Realtime made the symptom
   more visible (websocket keeps the auth client active), but the bug pre-dates
   03-04. Fix bundled into this PR via cherry-pick of `fix(session): avoid
   getSession deadlock inside onAuthStateChange`. Split `loadSession` into
   `loadUserContext` (DB-only, safe to call from the subscriber) and a thin
   `loadSession` (initial mount only). The subscriber now uses the
   `authSession` arg Supabase already provides; `TOKEN_REFRESHED` is a no-op.

## Threat Model Compliance

| Threat ID | Category | Mitigation |
|---|---|---|
| T-03-05 | Information Disclosure (Realtime Channel) | Channel uses a server-side filter (`filter: 'league_id=eq.<id>'`). The Supabase Realtime backend applies the filter before broadcasting to the subscriber, so a client only receives events for the league it's currently viewing. RLS on `leaderboard_snapshots` (defined in `20260401000000_init_schema.sql`) is the second line of defense — even if the filter were bypassed, RLS rejects rows the user can't read. Per-league channel naming prevents accidental cross-league sharing within a single client. |

## Verification Results

- `bunx tsc --noEmit` (apps/web) — **PASSED**
- `bun run lint` (apps/web) — **PASSED** (1 pre-existing
  `react-refresh/only-export-components` warning in `SessionContext.tsx`,
  unrelated to this plan; carried over from 03-03)
- `grep "supabase.channel" apps/web/src/components/tabs/RankingTab.tsx` — **MATCHED** (line 35)
- `ls apps/web/src/components/BonusPrediction.tsx` — **EXISTS**

## Deferred / Out of Scope

Manual UAT items from the plan's `<verification>` block are not yet executed —
the parent orchestrator runs E2E (`bunx playwright test`) and any manual
two-window real-time check before opening the PR. Specifically:

- **UAT 1** ("Submit a bonus prediction; refresh; verify it persists") — needs
  a running stack (`supabase start` + `bun --bun vite` in apps/web). Code path
  is straightforward upsert + React Query invalidation; logic is covered by
  tsc but the round-trip needs a browser.
- **UAT 2** ("Open the app in two windows; update a score in one via admin;
  verify the leaderboard updates in the other instantly") — same. Requires
  the Phase 3 scoring engine + `/admin` flow from 03-03 to push a snapshot.

No code work was deferred. No stubs introduced.

## Known Stubs

None for this plan. The bonus question fallback list is intentional — matches
seeded without `bonus_question` (everything before the admin can populate it)
fall back to the 10-question rotation. Documented in CONTEXT.md D-09.

## Self-Check: PASSED

- `apps/web/src/components/BonusPrediction.tsx`: EXISTS, props updated, booleans throughout
- `apps/web/src/components/tabs/PredictTab.tsx`: EXISTS, handleBonusSave + JSX wiring confirmed
- `apps/web/src/components/tabs/RankingTab.tsx`: EXISTS, `supabase.channel(\`leaderboard-${session.leagueId}\`)` on line 35
- `apps/web/src/lib/supabase/types.ts`: EXISTS, `bonus_question` + `bonus_answer` added
- Commit `09113c4` (feat: persist bonus predictions): FOUND in git log
- Commit `1446007` (feat: realtime leaderboard): FOUND in git log
- tsc clean (apps/web): CONFIRMED
- lint clean (apps/web; pre-existing SessionContext warning only): CONFIRMED
