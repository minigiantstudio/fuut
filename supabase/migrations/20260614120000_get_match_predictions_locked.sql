-- Allow get_match_predictions to return data for LOCKED matches (kickoff passed,
-- not yet scored). Predictions are immutable once kickoff passes, so showing
-- them to league members is safe — they can no longer be copied.
-- Previously the guard required is_final = true, which caused infinite loading
-- for locked matches since the RPC returned empty and the UI kept showing a spinner.

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

  -- D-09: peers stay hidden until kickoff has passed (match is LOCKED or SCORED).
  -- Before kickoff, predictions are still editable and must not be visible to
  -- avoid copying. After kickoff they're locked and safe to reveal.
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = p_match_id AND m.kickoff_at <= NOW()
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

GRANT EXECUTE ON FUNCTION public.get_match_predictions(uuid, uuid) TO authenticated;
