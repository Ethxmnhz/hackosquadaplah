-- Fix the error with the 'references' column by using a different approach
-- The error was: syntax error at or near "references" when using ALTER TABLE challenges ADD COLUMN references text[];

-- First, create a temporary table to hold the challenge data
CREATE TEMP TABLE temp_challenges AS SELECT * FROM challenges;

-- Add the new columns to the challenges table using quoted identifiers to handle reserved keywords
ALTER TABLE challenges 
  ADD COLUMN IF NOT EXISTS "short_description" text,
  ADD COLUMN IF NOT EXISTS "scenario" text,
  ADD COLUMN IF NOT EXISTS "learning_objectives" text[],
  ADD COLUMN IF NOT EXISTS "tools_required" text[],
  ADD COLUMN IF NOT EXISTS "prerequisites" text[],
  ADD COLUMN IF NOT EXISTS "target_audience" text,
  ADD COLUMN IF NOT EXISTS "estimated_time" integer,
  ADD COLUMN IF NOT EXISTS "author_notes" text;

-- Add the references column separately with quotes to avoid the reserved keyword issue
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS "references" text[];

-- Fix the source_type constraint in user_points to allow 'operation' as a valid source type
ALTER TABLE user_points DROP CONSTRAINT IF EXISTS user_points_source_type_check;
ALTER TABLE user_points ADD CONSTRAINT user_points_source_type_check 
CHECK (source_type IN ('challenge', 'lab', 'operation', 'badge', 'achievement', 'bonus', 'manual'));

-- Add hints and solution_explanation columns to challenge_questions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenge_questions' AND column_name = 'hints'
    ) THEN
        ALTER TABLE challenge_questions ADD COLUMN hints text[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenge_questions' AND column_name = 'solution_explanation'
    ) THEN
        ALTER TABLE challenge_questions ADD COLUMN solution_explanation text;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenge_questions' AND column_name = 'difficulty_rating'
    ) THEN
        ALTER TABLE challenge_questions ADD COLUMN difficulty_rating integer DEFAULT 3;
    END IF;
END $$;