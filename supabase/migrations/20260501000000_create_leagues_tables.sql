-- Create leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    invite_code text UNIQUE NOT NULL,
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now()
);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON public.leagues (invite_code);

-- Create league_members table
CREATE TABLE IF NOT EXISTS public.league_members (
    league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member', -- admin, member
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (league_id, user_id)
);

-- Index for user membership lookups
CREATE INDEX IF NOT EXISTS idx_league_members_user_id ON public.league_members (user_id);

-- Enable RLS
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- Policies for leagues
CREATE POLICY "Public leagues read" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Leagues insert only for authenticated users" ON public.leagues FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for league_members
CREATE POLICY "Public league members read" ON public.league_members FOR SELECT USING (true);
CREATE POLICY "League members insert" ON public.league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
