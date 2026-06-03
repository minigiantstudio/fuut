-- Phase: League admin tools — promote/demote member + delete league
--
-- Functions added:
--   1. set_member_role(p_league_id, p_user_id, p_new_role)
--      Promotes a member to 'admin' or demotes an admin to 'member'.
--      Rules:
--        - Caller must be admin of the league.
--        - Cannot change own role (self-demotion blocked).
--        - Cannot demote the last admin (league must always have ≥1 admin).
--        - Role must be 'admin' or 'member'.
--
--   2. delete_league(p_league_id)
--      Hard-deletes a league and all its data.
--      Rules:
--        - Caller must be admin of the league.
--        - Cascades: predictions → leaderboard_snapshots → snapshot_tokens
--          → league_members → leagues (all have league_id FKs).

-- ────────────────────────────────────────────────────────────────────────────
-- 1. set_member_role
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_member_role(
  p_league_id uuid,
  p_user_id   uuid,
  p_new_role  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_admin_count int;
BEGIN
  -- Validate role value
  IF p_new_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'INVALID_ROLE' USING HINT = 'Role must be admin or member';
  END IF;

  -- Caller must be admin of this league
  IF NOT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id
      AND user_id   = v_caller_id
      AND role      = 'admin'
  ) THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING HINT = 'Only admins can change member roles';
  END IF;

  -- Cannot change own role
  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'SELF_ROLE_CHANGE' USING HINT = 'You cannot change your own role';
  END IF;

  -- If demoting an admin, ensure at least one admin remains after the change
  IF p_new_role = 'member' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM league_members
    WHERE league_id = p_league_id AND role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'LAST_ADMIN' USING HINT = 'Cannot demote the last admin of a league';
    END IF;
  END IF;

  -- Apply the role change
  UPDATE league_members
  SET role = p_new_role
  WHERE league_id = p_league_id
    AND user_id   = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND' USING HINT = 'Member not found in this league';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, uuid, text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. delete_league
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_league(p_league_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
BEGIN
  -- Caller must be admin of this league
  IF NOT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id
      AND user_id   = v_caller_id
      AND role      = 'admin'
  ) THEN
    RAISE EXCEPTION 'NOT_ADMIN' USING HINT = 'Only admins can delete a league';
  END IF;

  -- Delete in dependency order (FKs without CASCADE)
  DELETE FROM predictions         WHERE league_id = p_league_id;
  DELETE FROM leaderboard_snapshots WHERE league_id = p_league_id;
  -- snapshot_tokens and league_members have ON DELETE CASCADE on leagues,
  -- but deleting explicitly is safer and avoids FK ordering issues.
  DELETE FROM snapshot_tokens     WHERE league_id = p_league_id;
  DELETE FROM league_members      WHERE league_id = p_league_id;
  DELETE FROM leagues             WHERE id = p_league_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_league(uuid) TO authenticated;
