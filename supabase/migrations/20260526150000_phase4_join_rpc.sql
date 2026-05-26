-- Phase 4 / Plan 04-02: join_league_by_code RPC.
--
-- Centralizes the league-join path so we can enforce LEAGUE_FREE_MAX_MEMBERS on
-- the free tier server-side. Previously, apps/web/src/components/Onboarding.tsx
-- did a direct `from("league_members").insert(...)`, which meant any cap check
-- would have to be duplicated on the client and could be bypassed by anyone
-- with a Supabase anon key. This function runs as SECURITY DEFINER and is the
-- only sanctioned path for joining (RLS still permits direct inserts for now —
-- a follow-up could revoke that to make this the only path).
--
-- Errors are raised with SQLSTATE P0001 and a deterministic MESSAGE so the JS
-- client can match on it:
--   NOT_AUTHENTICATED — auth.uid() is null
--   INVALID_CODE       — no league matches the (uppercased) invite code
--   LEAGUE_FULL        — free-tier league is at LEAGUE_FREE_MAX_MEMBERS
--
-- Re-joining an existing league is idempotent: returns the existing role
-- without re-inserting (league_members has no unique constraint on
-- (user_id, league_id), so this guards against duplicate rows).

CREATE OR REPLACE FUNCTION public.join_league_by_code(p_code text)
RETURNS TABLE (league_id uuid, league_name text, member_role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_league         public.leagues%ROWTYPE;
  v_max_members    int;
  v_current_count  int;
  v_existing_role  text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_league
    FROM public.leagues
   WHERE invite_code = upper(trim(p_code));

  IF v_league.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CODE' USING ERRCODE = 'P0001';
  END IF;

  -- Idempotent re-join: already-members get success back without a new row.
  SELECT role INTO v_existing_role
    FROM public.league_members
   WHERE league_members.league_id = v_league.id
     AND user_id = v_user_id;

  IF v_existing_role IS NOT NULL THEN
    RETURN QUERY SELECT v_league.id, v_league.name, v_existing_role;
    RETURN;
  END IF;

  IF v_league.tier = 'free' THEN
    SELECT (value::text)::int INTO v_max_members
      FROM public.app_config
     WHERE key = 'LEAGUE_FREE_MAX_MEMBERS';
    v_max_members := COALESCE(v_max_members, 10);

    SELECT count(*) INTO v_current_count
      FROM public.league_members
     WHERE league_members.league_id = v_league.id;

    IF v_current_count >= v_max_members THEN
      RAISE EXCEPTION 'LEAGUE_FULL' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.league_members (user_id, league_id, role)
       VALUES (v_user_id, v_league.id, 'member');

  RETURN QUERY SELECT v_league.id, v_league.name, 'member'::text;
END;
$$;

REVOKE ALL     ON FUNCTION public.join_league_by_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_league_by_code(text) FROM anon;
GRANT EXECUTE  ON FUNCTION public.join_league_by_code(text) TO authenticated;
