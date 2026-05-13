-- Add unique constraint to predictions table to support upsert functionality
ALTER TABLE public.predictions
ADD CONSTRAINT unique_prediction_per_match_per_user_per_league
UNIQUE (user_id, league_id, match_id);
