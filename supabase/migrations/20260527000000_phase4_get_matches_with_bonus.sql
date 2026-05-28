-- Phase 4 Plan 03: Server-side bonus question redaction.
--
-- Threat T-04-04 (Information Disclosure on the match RPC) requires that bonus
-- question text be unavailable to clients until the configured reveal lead time.
-- The init migration ships a "public matches read" RLS policy on public.matches
-- (granting anon + authenticated full row SELECT), which would let any client
-- scrape the catalog by reading matches.bonus_question directly. Two pieces are
-- needed to close the gap:
--
--   1. A SECURITY DEFINER RPC that returns the rest of the match row but only
--      exposes bonus_question after now() >= reveal_at. It also returns
--      reveal_at + is_bonus_revealed so the client can render the countdown.
--   2. A REAL column lockdown. A naive `REVOKE SELECT (bonus_question)` is a
--      no-op here: Supabase grants table-wide SELECT on public.matches to anon
--      + authenticated, and a whole-table grant implicitly covers every column,
--      so the column-level revoke can't subtract from it. The only way to gate a
--      single column is to revoke table SELECT entirely, then re-grant SELECT on
--      every column EXCEPT bonus_question. PredictTab, ResultsTab and the admin
--      dashboard are all migrated onto the RPC so they keep working.
--
-- The redaction calculation depends on the app_config row seeded by 04-01
-- (key='bonus_reveal_lead_minutes', value=60). app_config stores jsonb scalars
-- so the extraction must go through `(value::text)::int` — `value->>'...'` does
-- not work for top-level scalars (lesson learned in 04-02).

CREATE OR REPLACE FUNCTION public.get_matches_with_bonus()
RETURNS TABLE (
  id uuid,
  home_team text,
  away_team text,
  kickoff_at timestamptz,
  stage text,
  group_name text,
  home_score integer,
  away_score integer,
  is_final boolean,
  bonus_question text,
  bonus_result boolean,
  is_manual_override boolean,
  reveal_at timestamptz,
  is_bonus_revealed boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT COALESCE(
      (SELECT (value::text)::int FROM public.app_config WHERE key = 'bonus_reveal_lead_minutes'),
      60
    ) AS lead_minutes
  )
  SELECT
    m.id,
    m.home_team,
    m.away_team,
    m.kickoff_at,
    m.stage,
    -- matches has no group_name column (the frontend DbMatch type declares it
    -- but no migration ever added it — historically a phantom that came back
    -- undefined from select('*')). Return NULL so the RPC shape still matches
    -- the existing client type and the group filter behaves exactly as before.
    -- Position must stay 6th to align with the RETURNS TABLE column order.
    NULL::text AS group_name,
    m.home_score,
    m.away_score,
    m.is_final,
    CASE
      WHEN now() >= m.kickoff_at - (cfg.lead_minutes * interval '1 minute')
        THEN m.bonus_question
      ELSE NULL
    END AS bonus_question,
    m.bonus_result,
    m.is_manual_override,
    m.kickoff_at - (cfg.lead_minutes * interval '1 minute') AS reveal_at,
    (now() >= m.kickoff_at - (cfg.lead_minutes * interval '1 minute')) AS is_bonus_revealed
  FROM public.matches m
  CROSS JOIN cfg
  ORDER BY m.kickoff_at;
$$;

-- The redaction RPC is the only client-facing source of bonus_question, so it
-- must be callable by every client role. The admin dashboard reads matches with
-- the anon key (it carries its own HMAC token, not a Supabase session), so anon
-- needs EXECUTE too. Redaction is identical regardless of caller, so exposing it
-- to anon leaks nothing.
REVOKE ALL ON FUNCTION public.get_matches_with_bonus() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_matches_with_bonus() TO anon;
GRANT EXECUTE ON FUNCTION public.get_matches_with_bonus() TO authenticated;

-- Real column lockdown for matches.bonus_question. A column-level
-- `REVOKE SELECT (bonus_question)` does NOT work while a table-wide SELECT grant
-- exists (the table grant implicitly covers all columns, present and future).
-- So: revoke table SELECT, then re-grant SELECT on every column EXCEPT
-- bonus_question. After this, a direct REST `matches?select=bonus_question`
-- from anon/authenticated returns "permission denied for column"; the only path
-- to the column is get_matches_with_bonus() (SECURITY DEFINER, runs as owner)
-- which gates it on reveal time. Closes threat T-04-04.
--
-- NOTE: any future column added to public.matches must be added to this GRANT
-- list or it will be unreadable by clients. This is the cost of column-level
-- security and is intentional — bonus_question stays the lone exclusion.
REVOKE SELECT ON public.matches FROM anon;
REVOKE SELECT ON public.matches FROM authenticated;
GRANT SELECT (
  id, home_team, away_team, kickoff_at, stage,
  home_score, away_score, is_final, bonus_result, is_manual_override
) ON public.matches TO anon;
GRANT SELECT (
  id, home_team, away_team, kickoff_at, stage,
  home_score, away_score, is_final, bonus_result, is_manual_override
) ON public.matches TO authenticated;
-- service_role / postgres retain full access (Supabase schema-level grants).
-- The scoring engine writes via service_role and the RPC reads via SECURITY
-- DEFINER, so neither is affected by the client-role lockdown.
