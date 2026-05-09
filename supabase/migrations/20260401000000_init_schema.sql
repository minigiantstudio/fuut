-- Enable Row Level Security (RLS)
-- ALTER SYSTEM SET "row_level_security" = ON;

-- 1. Table: public.users
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  email text,
  is_anonymous boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Table: public.leagues
CREATE TABLE public.leagues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leagues_pkey PRIMARY KEY (id),
  CONSTRAINT leagues_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Enable RLS for leagues
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

-- 3. Table: public.league_members
CREATE TABLE public.league_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'viewer'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT league_members_pkey PRIMARY KEY (id),
  CONSTRAINT league_members_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id),
  CONSTRAINT league_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Enable RLS for league_members
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- 4. Table: public.matches
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  home_team text NOT NULL,
  away_team text NOT NULL,
  kickoff_at timestamp with time zone NOT NULL,
  stage text NOT NULL CHECK (stage = ANY (ARRAY['group'::text, 'r16'::text, 'qf'::text, 'sf'::text, 'final'::text])),
  home_score integer,
  away_score integer,
  is_final boolean NOT NULL DEFAULT false,
  CONSTRAINT matches_pkey PRIMARY KEY (id)
);

-- Enable RLS for matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 5. Table: public.predictions
CREATE TABLE public.predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  league_id uuid NOT NULL,
  match_id uuid NOT NULL,
  home_score integer NOT NULL,
  away_score integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  is_scored boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT predictions_pkey PRIMARY KEY (id),
  CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT predictions_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id),
  CONSTRAINT predictions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);

-- Enable RLS for predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- 6. Table: public.leaderboard_snapshots
CREATE TABLE public.leaderboard_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  total_points integer NOT NULL,
  rank_delta integer NOT NULL DEFAULT 0,
  snapshot_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leaderboard_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT leaderboard_snapshots_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id),
  CONSTRAINT leaderboard_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Enable RLS for leaderboard_snapshots
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;


-- RLS Policies

-- Users
CREATE POLICY "Public users read" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert own record" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Matches
CREATE POLICY "Public matches read" ON public.matches FOR SELECT USING (true);

-- Predictions
CREATE POLICY "Users can select their own predictions" ON public.predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own predictions" ON public.predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own predictions" ON public.predictions FOR DELETE USING (auth.uid() = user_id);

-- Leagues
CREATE POLICY "Public leagues read" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Users can create leagues" ON public.leagues FOR INSERT WITH CHECK (auth.uid() = created_by);

-- League Members
CREATE POLICY "League members read" ON public.league_members FOR SELECT USING (true);
CREATE POLICY "League members insert" ON public.league_members FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Triggers

-- Trigger to create user on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nickname, email, is_anonymous)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nickname', 'User_' || substr(new.id::text, 1, 8)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'is_anonymous')::boolean, new.email IS NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
