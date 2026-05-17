-- Phase 3 / Plan 04 follow-up: RLS policy for leaderboard_snapshots.
--
-- The init migration (20260401000000_init_schema.sql:97) enabled RLS on
-- public.leaderboard_snapshots but never added a SELECT policy. With RLS
-- enabled and no policies, Postgres denies all reads to non-superusers.
--
-- The leaderboard itself still rendered because get_leaderboard() is a
-- SECURITY DEFINER RPC that bypasses RLS. But Supabase Realtime applies
-- RLS when deciding which CDC events to broadcast to which clients, so
-- subscribers received zero INSERT/UPDATE events even though the
-- realtime publication included the table. This broke plan 03-04's
-- "leaderboard updates without manual refresh" goal in practice.
--
-- This policy scopes SELECT (and therefore realtime broadcast eligibility)
-- to rows whose league_id is one of the leagues the authenticated user
-- belongs to. INSERT/UPDATE/DELETE remain deny-all by default — the
-- scoring engine writes via the service-role key, which bypasses RLS.

CREATE POLICY "Members read their league leaderboard"
ON public.leaderboard_snapshots
FOR SELECT
USING (
  league_id IN (
    SELECT league_id FROM public.league_members WHERE user_id = auth.uid()
  )
);
