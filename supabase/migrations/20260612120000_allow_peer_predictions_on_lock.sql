-- Redefine get_match_predictions to allow viewing peer picks once the match has started.
-- This fulfills the request to see peer predictions for LOCKED/NEEDS_RESULT matches.

CREATE OR REPLACE FUNCTION public.get_match_predictions(p_league_id uuid, p_match_id uuid)
RETURNS TABLE (
  user_id     uuid,
  nickname    text,
  role        text,
  home_score  integer,
  away_score  integer,
  bonus_answer boolean,
  points      integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Caller must belong to the league they're peeking into.
  IF NOT public.is_league_member(p_league_id) THEN
    RAISE EXCEPTION 'Permission denied: not a league member';
  END IF;

  -- Allow viewing if the match is final OR if it has already started.
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m 
    WHERE m.id = p_match_id 
    AND (m.is_final OR m.kickoff_at <= now())
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      lm.user_id,
      u.nickname,
      lm.role,
      p.home_score,
      p.away_score,
      p.bonus_answer,
      p.points
    FROM public.league_members lm
    JOIN public.users u ON u.id = lm.user_id
    LEFT JOIN public.predictions p
      ON p.user_id = lm.user_id
     AND p.league_id = p_league_id
     AND p.match_id = p_match_id
    WHERE lm.league_id = p_league_id;
END;
$$;
