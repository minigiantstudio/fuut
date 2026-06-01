-- Fix leaderboard ranking by handling NULLs in RANK() calculation
-- and pull the latest rank_delta from snapshots for the live leaderboard.

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_league_id uuid)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  total_points bigint,
  exact_matches bigint,
  bonus_points bigint,
  rank bigint,
  rank_delta integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    u.id as user_id,
    u.nickname,
    COALESCE(SUM(p.points), 0) as total_points,
    COALESCE(SUM(p.points_match) FILTER (WHERE p.points_match = 3), 0) / 3 as exact_matches,
    COALESCE(SUM(p.points_bonus), 0) as bonus_points,
    RANK() OVER (
      ORDER BY 
        COALESCE(SUM(p.points), 0) DESC, 
        COALESCE(SUM(p.points_bonus), 0) DESC, 
        COALESCE(SUM(p.points_match) FILTER (WHERE p.points_match = 3), 0) DESC
    ) as rank,
    COALESCE((
      SELECT ls.rank_delta 
      FROM public.leaderboard_snapshots ls 
      WHERE ls.user_id = u.id AND ls.league_id = p_league_id 
      ORDER BY ls.snapshot_at DESC 
      LIMIT 1
    ), 0) as rank_delta
  FROM public.users u
  JOIN public.league_members lm ON lm.user_id = u.id
  LEFT JOIN public.predictions p ON p.user_id = u.id AND p.league_id = p_league_id
  WHERE lm.league_id = p_league_id
  GROUP BY u.id, u.nickname
  ORDER BY rank ASC;
$$;

-- Add index to support efficient rank_delta lookup
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_user_league_at 
ON public.leaderboard_snapshots (user_id, league_id, snapshot_at DESC);
