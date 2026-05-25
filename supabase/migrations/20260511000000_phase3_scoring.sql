-- Phase 3: Scoring & Real-time Rankings Migration

-- 1. Table Updates: public.users
ALTER TABLE public.users ADD COLUMN is_global_admin boolean NOT NULL DEFAULT false;

-- 2. Table Updates: public.matches
ALTER TABLE public.matches ADD COLUMN bonus_question text;
ALTER TABLE public.matches ADD COLUMN bonus_result boolean;
ALTER TABLE public.matches ADD COLUMN is_manual_override boolean NOT NULL DEFAULT false;

-- 3. Table Updates: public.predictions
ALTER TABLE public.predictions ADD COLUMN bonus_answer boolean;
ALTER TABLE public.predictions ADD COLUMN is_bonus_scored boolean NOT NULL DEFAULT false;
ALTER TABLE public.predictions ADD COLUMN points_match integer NOT NULL DEFAULT 0;
ALTER TABLE public.predictions ADD COLUMN points_bonus integer NOT NULL DEFAULT 0;

-- 4. Table Updates: public.leaderboard_snapshots
ALTER TABLE public.leaderboard_snapshots ADD COLUMN exact_matches integer NOT NULL DEFAULT 0;
ALTER TABLE public.leaderboard_snapshots ADD COLUMN bonus_points integer NOT NULL DEFAULT 0;

-- 5. Update get_leaderboard function for tie-breakers (D-05)
-- We drop it first because the return type (table columns) is changing.
DROP FUNCTION IF EXISTS public.get_leaderboard(uuid);

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
        SUM(p.points) DESC, 
        SUM(p.points_bonus) DESC, 
        (SUM(p.points_match) FILTER (WHERE p.points_match = 3)) DESC
    ) as rank,
    0 as rank_delta
  FROM public.users u
  JOIN public.league_members lm ON lm.user_id = u.id
  LEFT JOIN public.predictions p ON p.user_id = u.id AND p.league_id = p_league_id
  WHERE lm.league_id = p_league_id
  GROUP BY u.id, u.nickname
  ORDER BY total_points DESC, bonus_points DESC, exact_matches DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;

-- 6. Enable Realtime for leaderboard_snapshots (if not already enabled)
-- Note: Realtime is usually enabled via the Supabase Dashboard, 
-- but we can ensure the publication exists.
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'leaderboard_snapshots'
  ) THEN
    -- This depends on how the publication was created, usually 'supabase_realtime'
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_snapshots;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add leaderboard_snapshots to publication. This might be due to missing publication or permissions.';
    END;
  END IF;
END $$;
