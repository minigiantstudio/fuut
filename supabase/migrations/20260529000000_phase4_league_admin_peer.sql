-- Phase 4 Plan 04: peer visibility + league admin tools.
--
-- Three SECURITY DEFINER RPCs (repo convention keeps Postgres functions in
-- migrations rather than the apps/api/src/rpc/ paths the plan named) plus one
-- app_config row:
--
--   1. get_match_predictions — D-09/D-10 peer visibility. Returns every league
--      member's prediction for a match, but ONLY once the match is_final
--      (SCORED). Before that it returns an empty set so the live window stays
--      suspenseful and peers can't be scraped early.
--   2. rename_league  — D-18/D-19, admin-only (threat T-04-05).
--   3. remove_member  — D-18/D-19/D-20 soft remove, admin-only, self-removal
--      blocked (threat T-04-06). Only the league_members row is deleted; the
--      member's predictions are intentionally kept (orphaned).
--   4. app_config.ADMIN_CONTACT_EMAIL — D-22 target for the "Request premium"
--      mailto. Stored in app_config (public SELECT, like LEAGUE_FREE_MAX_MEMBERS)
--      so it's tunable without a frontend rebuild.
--
-- leagues / league_members have no UPDATE or DELETE policy for client roles
-- (intentional — threat T-04-02), so these mutations must run as SECURITY
-- DEFINER. Each re-checks authorization via the is_league_admin/is_league_member
-- helpers from the phase-2 migration.

-- ---------------------------------------------------------------------------
-- 1. get_match_predictions — peer visibility on SCORED matches
-- ---------------------------------------------------------------------------
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

  -- D-09: peers stay hidden until the match is SCORED. Return nothing otherwise.
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m WHERE m.id = p_match_id AND m.is_final
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

-- ---------------------------------------------------------------------------
-- 2. rename_league — admin-only (T-04-05)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rename_league(p_league_id uuid, p_new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_league_admin(p_league_id) THEN
    RAISE EXCEPTION 'Permission denied: caller is not an admin of this league';
  END IF;

  IF p_new_name IS NULL OR length(trim(p_new_name)) = 0 THEN
    RAISE EXCEPTION 'League name cannot be empty';
  END IF;

  IF length(trim(p_new_name)) > 50 THEN
    RAISE EXCEPTION 'League name too long (max 50 characters)';
  END IF;

  UPDATE public.leagues
    SET name = trim(p_new_name)
    WHERE id = p_league_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_league(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. remove_member — admin-only soft remove, self-removal blocked (T-04-06)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_member(p_league_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_league_admin(p_league_id) THEN
    RAISE EXCEPTION 'Permission denied: caller is not an admin of this league';
  END IF;

  -- An admin removing themselves would orphan the league (single-admin model,
  -- D-18). Transfer-admin is deferred, so block it.
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot remove themselves';
  END IF;

  -- D-20 soft remove: drop only the membership. The member's predictions rows
  -- are kept (orphaned under user_id with no league_members join) so a re-join
  -- restores their history.
  DELETE FROM public.league_members
    WHERE league_id = p_league_id
      AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_member(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. ADMIN_CONTACT_EMAIL — target for the D-22 "Request premium" mailto
-- ---------------------------------------------------------------------------
INSERT INTO public.app_config (key, value) VALUES
  ('ADMIN_CONTACT_EMAIL', '"admin@fuut.app"'::jsonb)
ON CONFLICT (key) DO NOTHING;
