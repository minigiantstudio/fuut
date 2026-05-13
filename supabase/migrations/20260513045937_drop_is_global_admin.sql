-- Drop users.is_global_admin column added by 20260511000000_phase3_scoring.sql.
--
-- Plan 03-03 pivoted from DB-flag admin authorization (superseded DEC-016/017)
-- to a dedicated apps/admin/ app with env-var credentials and HMAC JWTs (DEC-018).
-- The column is no longer consulted by any code path.

ALTER TABLE public.users DROP COLUMN IF EXISTS is_global_admin;
