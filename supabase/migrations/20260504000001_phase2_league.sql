-- Phase 2: League & Prediction Core
-- Migration: UNIQUE constraint on leagues.invite_code + create_league + regenerate_invite_code RPCs
-- Date: 2026-05-04

-- 1. Enforce uniqueness on invite_code (idempotent — safe to run even if constraint already exists)
ALTER TABLE public.leagues
  ADD CONSTRAINT IF NOT EXISTS leagues_invite_code_key UNIQUE (invite_code);

-- 2. create_league RPC
-- Atomically generates a unique invite code, inserts the league row, and adds the creator as admin.
-- Granted to authenticated role (anonymous Supabase users get the 'authenticated' role after signInAnonymously).
-- Returns { id uuid, invite_code text }.
CREATE OR REPLACE FUNCTION public.create_league(p_name text, p_user_id uuid)
RETURNS TABLE(id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_id uuid;
  v_attempts int := 0;
BEGIN
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
    VALUES (p_name, v_code, p_user_id)
    RETURNING public.leagues.id INTO v_id;

  -- Add creator as admin member
  INSERT INTO public.league_members(league_id, user_id, role)
    VALUES (v_id, p_user_id, 'admin');

  RETURN QUERY SELECT v_id, v_code;
END;
$$;

-- Grant to authenticated role (Supabase anonymous users use the 'authenticated' role)
GRANT EXECUTE ON FUNCTION public.create_league(text, uuid) TO authenticated;

-- 3. regenerate_invite_code RPC
-- Admin-only: generates a new unique invite code for a league and returns it.
-- RLS enforced by checking caller is the league admin via is_league_admin().
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

-- Grant to authenticated role
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(uuid) TO authenticated;
