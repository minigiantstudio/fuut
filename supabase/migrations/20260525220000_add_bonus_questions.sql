-- Migration: Add bonus questions and bonus result tracking to matches
-- This migration ensures every match has a bonus question by cycling through 50 curated options.

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "bonus_question" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "bonus_result" BOOLEAN;

-- Pre-populate matches with bonus questions from the list
DO $$
DECLARE
    questions TEXT[] := ARRAY[
        'Will there be a pitch invader?',
        'Will the coach get a yellow card?',
        'Will a goal be overturned by VAR?',
        'Will there be a red card?',
        'Will there be a goal in stoppage time?',
        'Will a goalkeeper score?',
        'Will there be an own goal?',
        'Will the first goal be a header?',
        'Will there be a penalty?',
        'Will a substitute score?',
        'Will a player score a hat-trick?',
        'Will the total number of corners be over 10?',
        'Will there be a goal scored within the first 10 minutes?',
        'Will both teams score?',
        'Will the winning team score 3 or more goals?',
        'Will a player get booked in the first half?',
        'Will the match go to extra time?',
        'Will there be more than 4 total goals scored?',
        'Will the captain score a goal?',
        'Will there be a goal from outside the penalty box?',
        'Will a player be sent off after a second yellow card?',
        'Will the game be decided by a penalty shootout?',
        'Will the referee check the pitch-side monitor?',
        'Will a player hit the woodwork (post or crossbar)?',
        'Will there be more than 3 substitutions for a single team?',
        'Will the game end in a 0-0 draw?',
        'Will a defender score a goal?',
        'Will a goal be scored in the first 5 minutes?',
        'Will both goalkeepers make at least 3 saves?',
        'Will there be an injury stoppage longer than 3 minutes?',
        'Will the winning team come from behind?',
        'Will the match reach half-time with a draw?',
        'Will there be a free-kick goal?',
        'Will the total number of yellow cards exceed 4?',
        'Will a player receive a straight red card?',
        'Will a goal be scored by a player who came off the bench?',
        'Will the match attendance be mentioned?',
        'Will a player be substituted in the first half?',
        'Will the ball hit the post and go in?',
        'Will the winning team score in the final 10 minutes?',
        'Will there be more than 10 total shots on target?',
        'Will the match be delayed for any reason?',
        'Will a player score with their left foot?',
        'Will a player score with their right foot?',
        'Will a penalty be missed or saved?',
        'Will the score line change in stoppage time?',
        'Will the same player score more than once?',
        'Will the winning team maintain their lead until the end?',
        'Will a player be cautioned for time wasting?',
        'Will the final score be a 1-0 result?'
    ];
    match_row RECORD;
    i INT := 1;
BEGIN
    FOR match_row IN SELECT id FROM matches ORDER BY kickoff_at LOOP
        UPDATE matches
        SET bonus_question = questions[((i - 1) % array_length(questions, 1)) + 1]
        WHERE id = match_row.id;
        i := i + 1;
    END LOOP;
END $$;
