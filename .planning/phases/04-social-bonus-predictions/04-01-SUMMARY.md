---
phase: 04-social-bonus-predictions
plan: 01
status: complete
wave: 1
---

# Summary - Plan 04-01 (Database Foundation & Bonus Question Catalog)

## Objective
Establish the database foundation for Phase 4 social/bonus features and replace the
broken in-migration `matches.bonus_question` backfill with a catalog-driven seed.

## Scope Trim
The plan as written assumed a fresh start. Reality: PR #25 had already landed
`matches.bonus_question` + `matches.bonus_result` columns plus a `ResultsTab` UI update
and a `lib/supabase/types.ts` patch. Those parts were skipped; this plan executed the
outstanding ~65%:

- ✅ `bonus_question_catalog` table
- ✅ `app_config` table + seeded keys
- ✅ `snapshot_tokens` table
- ✅ `leagues.tier` column
- ✅ RLS policies for all three new tables
- ✅ ~30 curated catalog rows in `seed.sql`
- ✅ `matches.bonus_question` populated from catalog (was 0/72; now 72/72)
- ✅ `packages/types/src/database.types.ts` regenerated

## Work Completed

### Database schema (new migration)
- **File**: `supabase/migrations/20260525223000_phase4_social_foundation.sql`
- **Filename note**: timestamped 30 minutes after PR #25's
  `20260525220000_add_bonus_questions.sql` so the two phase-4 migrations sort in the
  order they were authored. (Plan originally proposed `20260520000000`; bumped to
  today's timestamp for clean chronology.)
- **Tables added**:
  - `bonus_question_catalog (id uuid PK, prompt_text text NOT NULL, category text, created_at timestamptz)`
  - `app_config (key text PK, value jsonb)` — seeded `bonus_reveal_lead_minutes=60`, `LEAGUE_FREE_MAX_MEMBERS=10` per D-07 / D-21.
  - `snapshot_tokens (token text PK, league_id uuid NOT NULL REFERENCES leagues ON DELETE CASCADE, snapshot_payload jsonb, created_by uuid REFERENCES users, created_at timestamptz)` + index on `league_id`.
- **Column added**: `leagues.tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium'))`.
- **RLS policies**:
  - `bonus_question_catalog`: public SELECT.
  - `app_config`: public SELECT (values are non-sensitive; writes via service role).
  - `snapshot_tokens`: public SELECT (token is the access control); authenticated INSERT scoped to `auth.uid() = created_by`.
  - `leagues.tier` write protection covered by **absence** of any UPDATE policy on `leagues` — threat T-04-02 mitigated without extra rules.

### Catalog seed + match assignment
- **File**: `supabase/seed.sql`
- Added 30 catalog rows with stable UUIDs (`b1000000-0000-4000-a000-00000000000{1..1e}`) and loose categories (`discipline`, `goals`, `set-piece`, `flow`, `scoreline`, `officiating`).
- Appended a DO block that loops `matches ORDER BY kickoff_at, id` and assigns each match a `bonus_question` from the catalog via deterministic cycling.
- This DO block is the **functional replacement** for the broken DO block in
  `20260525220000_add_bonus_questions.sql`, which iterated zero rows because matches
  don't exist at migration time (they're seeded *after* migrations run). The original
  migration's columns remain; its DO block is now harmless dead code, untouched per the
  "never edit committed migrations" rule.

### Types regen
- **File**: `packages/types/src/database.types.ts`
- Regenerated via `supabase gen types typescript --local`.
- Now includes `app_config`, `bonus_question_catalog`, `snapshot_tokens`, and `leagues.tier`.
- Hand-maintained types in `apps/web/src/lib/supabase/types.ts` were **not** touched —
  none of the new tables are consumed by this plan; adding them ahead of need would be
  scope creep. Plan 04-02+ will extend `DbLeague` etc. as actual consumers arrive.

## Verification Results
- `supabase db reset` — PASS. All 8 migrations apply cleanly, seed completes.
- DB inspection:
  - 3 new tables present.
  - `leagues.tier` exists, default `'free'`, existing league row defaulted.
  - `bonus_question_catalog` has 30 rows.
  - `app_config` has both seeded keys with correct JSONB values.
  - `matches.bonus_question` populated for **72/72** matches (was 0/72), all 30 catalog questions in use.
  - 4 RLS policies registered across the new tables.
- `bunx tsc --noEmit` — PASS in `apps/web`, `apps/api`, `packages/types`.
- `bun run lint` — PASS in `apps/web` (one pre-existing warning in `SessionContext.tsx` unrelated to this plan) and `apps/api`. `packages/types` has no lint script.

## Bugs Found and Fixed
- **0/72 matches had `bonus_question` populated locally** despite PR #25's migration
  appearing successful. Root cause: that migration's DO block runs at migration time,
  but matches are seeded by `supabase/seed.sql` *after* migrations. Loop iterated zero
  rows, exited silently. **Fix**: moved the assignment into `seed.sql` and sourced
  questions from the new catalog table — fixes both 04-01 and the pre-existing bug in
  one change. Production was unaffected because the operator runs the snippet
  `supabase/snippets/Untitled query 947.sql` manually from Studio after the migration.
  No code change needed for prod; the snippet still works there.

## Lessons Learned
- Migrations cannot populate `matches.*` because matches are seeded after migrations.
  Per-match data backfills belong in `seed.sql` or in a runtime/admin task — never in
  a migration's DO block.
- `supabase gen types typescript --local` is the local-DB equivalent of the existing
  `packages/types` `gen` script (which targets the remote project via
  `SUPABASE_PROJECT_ID`). Worth adding a `gen:local` script as a follow-up.
- A shell pipeline of the form `cmd > file 2>&1 | head -N` truncates the redirected
  file in some shells. Always use a plain `>` redirect with no trailing pipe when the
  file output matters.

## Follow-ups (not in this PR)
- Add a `gen:local` script in `packages/types/package.json` for local regen workflow.
- Plan 04-02 will need to extend `apps/web/src/lib/supabase/types.ts` (`DbLeague` adds
  `tier`; new `DbAppConfig`, `DbBonusQuestion` interfaces).
- Consider whether the `supabase/snippets/Untitled query 947.sql` snippet (from PR #25)
  should be retired now that `seed.sql` owns local population — it's still useful for
  re-backfilling prod if needed, but its name suggests it was meant to be temporary.

## Next Step
Proceed to **Plan 04-02: Global Admin reveal timing + league tier enforcement**.
