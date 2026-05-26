-- Phase 4 social foundation: bonus question catalog, app config, snapshot tokens, league tiers.
--
-- New tables and one new column. Populating matches.bonus_question from the catalog
-- happens in seed.sql, not here — matches are seeded after migrations run, so any
-- in-migration UPDATE against matches would iterate zero rows.

-- ---------------------------------------------------------------------------
-- bonus_question_catalog: curated yes/no prompts surfaced on each match.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bonus_question_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text text NOT NULL,
  category    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_question_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bonus_question_catalog read"
  ON public.bonus_question_catalog FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- app_config: global key/value flags. Values are non-sensitive (lead time,
-- tier caps) and surfaced to all clients; writes happen via service role
-- from admin tooling (Plan 04-02).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public app_config read"
  ON public.app_config FOR SELECT USING (true);

INSERT INTO public.app_config (key, value) VALUES
  ('bonus_reveal_lead_minutes', '60'::jsonb),
  ('LEAGUE_FREE_MAX_MEMBERS',   '10'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- snapshot_tokens: opaque shareable ranking-moment links. The token itself
-- is the access control — anyone holding the URL can read the payload.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snapshot_tokens (
  token            text PRIMARY KEY,
  league_id        uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  snapshot_payload jsonb NOT NULL,
  created_by       uuid REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapshot_tokens_league_idx
  ON public.snapshot_tokens (league_id);

ALTER TABLE public.snapshot_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public snapshot_tokens read"
  ON public.snapshot_tokens FOR SELECT USING (true);

CREATE POLICY "Authenticated users create their own snapshot tokens"
  ON public.snapshot_tokens FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- leagues.tier: free/premium gating for Plan 04-04 (member cap enforcement).
-- No UPDATE policy on leagues exists, so tier is intrinsically write-protected
-- against public clients — matches threat T-04-02.
-- ---------------------------------------------------------------------------
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'premium'));
