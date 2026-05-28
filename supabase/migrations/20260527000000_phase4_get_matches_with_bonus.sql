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
--   2. A column-level REVOKE that strips bonus_question from anon + authenticated
--      so a direct `from('matches').select('bonus_question')` request fails.
--      Both PredictTab and ResultsTab are migrated onto the RPC in the same plan.
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
    m.group_name,
    m.home_score,
    m.away_score,
    m.is_final,
    CASE
      WHEN now() >= m.kickoff_at - (cfg.lead_minutes * interval '1 minute')
        THEN m.bonus_question
      ELSE NULL
    END AS bonus_question,
    m.bonus_result,
    m.kickoff_at - (cfg.lead_minutes * interval '1 minute') AS reveal_at,
    (now() >= m.kickoff_at - (cfg.lead_minutes * interval '1 minute')) AS is_bonus_revealed
  FROM public.matches m
  CROSS JOIN cfg
  ORDER BY m.kickoff_at;
$$;

-- Defense in depth: anon shouldn't be able to call this either since the only
-- consumers are logged-in app users (PredictTab + ResultsTab live behind the
-- session gate). Lock down to authenticated only.
REVOKE ALL ON FUNCTION public.get_matches_with_bonus() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_matches_with_bonus() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_matches_with_bonus() TO authenticated;

-- Column-level REVOKE — without this the RPC redaction is theatre, since any
-- client could query `matches.bonus_question` directly through the existing
-- "Public matches read" RLS policy. The matches table itself stays publicly
-- readable; only the one sensitive column is gated.
REVOKE SELECT (bonus_question) ON public.matches FROM anon;
REVOKE SELECT (bonus_question) ON public.matches FROM authenticated;
-- service_role / postgres retain access (Supabase default grants on schema
-- public). The scoring engine writes via service_role and the RPC reads via
-- SECURITY DEFINER, so neither is affected.
