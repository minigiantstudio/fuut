-- Phase 2: League & Prediction Core
-- Migration: UNIQUE constraint on leagues.invite_code + create_league + regenerate_invite_code RPCs
-- Date: 2026-05-04

-- 1. Enforce uniqueness on invite_code (idempotent — DO block guards against duplicate constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leagues_invite_code_key'
  ) THEN
    ALTER TABLE public.leagues ADD CONSTRAINT leagues_invite_code_key UNIQUE (invite_code);
  END IF;
END $$;

-- 2. is_league_admin helper
-- Returns true if the calling user (auth.uid()) is an admin of the given league.
-- Used by regenerate_invite_code to enforce admin-only access.
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

-- 3. create_league RPC
-- Atomically generates a unique invite code, inserts the league row, and adds the caller as admin.
-- CR-02 fix: uses auth.uid() internally instead of accepting p_user_id from the caller,
-- preventing privilege escalation where an authenticated user could create a league for any UUID.
-- Returns { id uuid, invite_code text }.
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

-- 4. regenerate_invite_code RPC
-- Admin-only: generates a new unique invite code for a league and returns it.
-- Calls is_league_admin() to verify auth.uid() is an admin before proceeding.
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
