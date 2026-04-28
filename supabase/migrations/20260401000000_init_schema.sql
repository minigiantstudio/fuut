-- Enable Row Level Security (RLS)
ALTER SYSTEM SET "row_level_security" = ON;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY DEFAULT auth.uid(),
    nickname text,
    avatar_url text,
    locale text DEFAULT 'en'
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy for profiles: Public read, Owner update
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, locale)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'locale');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_new_user();


-- Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    home_team text NOT NULL,
    away_team text NOT NULL,
    kickoff_at timestamptz NOT NULL,
    status text DEFAULT 'scheduled' -- e.g., scheduled, ongoing, finished
);

-- Enable RLS for matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- RLS Policy for matches: Public read, no public write
CREATE POLICY "Public matches read" ON public.matches FOR SELECT USING (true);
-- No INSERT, UPDATE, DELETE policies for public


-- Create predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    match_id uuid NOT NULL,
    home_score smallint,
    away_score smallint,
    points smallint, -- Calculated points for a prediction
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_match FOREIGN KEY (match_id) REFERENCES public.matches (id) ON DELETE CASCADE
);

-- Enable RLS for predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for predictions: Owner read/write, no other public access
CREATE POLICY "Users can select their own predictions" ON public.predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own predictions" ON public.predictions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own predictions" ON public.predictions FOR DELETE USING (auth.uid() = user_id);

-- Ensure updated_at is updated on row update
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_predictions_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
