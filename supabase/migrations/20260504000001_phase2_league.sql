-- Phase 2: League & Prediction Core
-- RPCs and Helpers for League Management

-- 1. lookup_league_by_invite_code
-- Returns league id and name for a given invite code.
-- Accessible by everyone (including anon) to resolve codes during onboarding.
CREATE OR REPLACE FUNCTION public.lookup_league_by_invite_code(p_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, name
  FROM public.leagues
  WHERE upper(invite_code) = upper(p_code);
$$;

GRANT EXECUTE ON FUNCTION public.lookup_league_by_invite_code(text) TO anon, authenticated;

-- 2. is_league_member helper
CREATE OR REPLACE FUNCTION public.is_league_member(p_league_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE league_id = p_league_id
      AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_league_member(uuid) TO authenticated;

-- 3. is_league_admin helper
CREATE OR REPLACE FUNCTION public.is_league_admin(p_league_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE league_id = p_league_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_league_admin(uuid) TO authenticated;

-- 4. is_any_league_admin helper
CREATE OR REPLACE FUNCTION public.is_any_league_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_any_league_admin() TO authenticated;

-- 5. get_league_members_with_nicknames
CREATE OR REPLACE FUNCTION public.get_league_members_with_nicknames(p_league_id uuid)
RETURNS TABLE(id uuid, joined_at timestamp with time zone, league_id uuid, nickname text, role text, user_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    lm.id,
    lm.joined_at,
    lm.league_id,
    u.nickname,
    lm.role,
    lm.user_id
  FROM public.league_members lm
  JOIN public.users u ON u.id = lm.user_id
  WHERE lm.league_id = p_league_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_league_members_with_nicknames(uuid) TO authenticated;

-- 6. get_leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_league_id uuid)
RETURNS TABLE(nickname text, rank integer, rank_delta integer, total_points integer, user_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    u.nickname,
    ls.rank,
    ls.rank_delta,
    ls.total_points,
    ls.user_id
  FROM public.leaderboard_snapshots ls
  JOIN public.users u ON u.id = ls.user_id
  WHERE ls.league_id = p_league_id
  ORDER BY ls.rank ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(uuid) TO authenticated;

-- 7. create_league RPC
-- Atomically generates a unique invite code, inserts the league row, and adds the caller as admin.
CREATE OR REPLACE FUNCTION public.create_league(p_name text)
RETURNS TABLE(id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_attempts int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate a unique 4-char uppercase alphanumeric code
  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leagues l WHERE l.invite_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique invite code after 10 attempts';
    END IF;
  END LOOP;

  -- Insert league row
  INSERT INTO public.leagues(name, invite_code, created_by)
    VALUES (p_name, v_code, v_user_id)
    RETURNING public.leagues.id INTO v_id;

  -- Add caller as admin member
  INSERT INTO public.league_members(league_id, user_id, role)
    VALUES (v_id, v_user_id, 'admin');

  RETURN QUERY SELECT v_id, v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_league(text) TO authenticated;

-- 8. regenerate_invite_code RPC
-- Admin-only: generates a new unique invite code for a league and returns it.
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_league_id uuid)
RETURNS TABLE(invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  -- Enforce admin-only access
  IF NOT public.is_league_admin(p_league_id) THEN
    RAISE EXCEPTION 'Permission denied: caller is not an admin of this league';
  END IF;

  -- Generate a new unique code
  LOOP
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.leagues l WHERE l.invite_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique invite code after 10 attempts';
    END IF;
  END LOOP;

  -- Update the league row
  UPDATE public.leagues SET invite_code = v_code WHERE public.leagues.id = p_league_id;

  RETURN QUERY SELECT v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(uuid) TO authenticated;
