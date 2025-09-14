/*
  # Fix Challenge Completion Tracking

  1. Changes
    - Ensure challenge_completions table has proper structure
    - Add points_earned column if missing
    - Fix RLS policies for challenge_completions
    - Ensure proper tracking of completed challenges

  2. Security
    - Users can view their own completions
    - Users can insert their own completions
*/

-- Ensure challenge_completions table exists with proper structure
CREATE TABLE IF NOT EXISTS challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  points_earned integer DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Add points_earned column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_completions' AND column_name = 'points_earned'
  ) THEN
    ALTER TABLE challenge_completions ADD COLUMN points_earned integer DEFAULT 0;
  END IF;
END $$;

-- Add completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenge_completions' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE challenge_completions ADD COLUMN completed_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS on challenge_completions
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own challenge completions" ON challenge_completions;
DROP POLICY IF EXISTS "Users can insert their own challenge completions" ON challenge_completions;
DROP POLICY IF EXISTS "Users can update their own challenge completions" ON challenge_completions;

-- Create RLS policies for challenge_completions
CREATE POLICY "Users can view their own challenge completions"
  ON challenge_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge completions"
  ON challenge_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge completions"
  ON challenge_completions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure user_points table has proper structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_points' AND column_name = 'earned_at'
  ) THEN
    ALTER TABLE user_points ADD COLUMN earned_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create a function to handle challenge completion properly
CREATE OR REPLACE FUNCTION handle_challenge_completion_v2()
RETURNS TRIGGER AS $$
DECLARE
  challenge_points_value INTEGER := 0;
  user_current_badge_count INTEGER := 0;
BEGIN
  -- Get points from the challenge table
  SELECT ch.points INTO challenge_points_value
  FROM challenges ch
  WHERE ch.id = NEW.challenge_id;
  
  -- Set default if null
  challenge_points_value := COALESCE(challenge_points_value, 0);
  
  -- Get current badge count for this user
  SELECT COALESCE(us.badge_count, 0) INTO user_current_badge_count
  FROM user_stats us
  WHERE us.user_id = NEW.user_id;
  
  -- Update user_stats table with completely explicit references
  INSERT INTO user_stats (
    user_id, 
    challenges_completed, 
    total_points, 
    badge_count, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.user_id, 
    1, 
    challenge_points_value, 
    user_current_badge_count,
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    challenges_completed = user_stats.challenges_completed + 1,
    total_points = user_stats.total_points + challenge_points_value,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE NOTICE 'Error in handle_challenge_completion_v2: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_challenge_completion_v2 ON challenge_completions;

-- Create trigger for challenge completions
CREATE TRIGGER on_challenge_completion_v2
  AFTER INSERT ON challenge_completions
  FOR EACH ROW
  EXECUTE FUNCTION handle_challenge_completion_v2();

-- Update existing challenge_completions to have points_earned
UPDATE challenge_completions 
SET points_earned = (
  SELECT COALESCE(c.points, 0)
  FROM challenges c
  WHERE c.id = challenge_completions.challenge_id
)
WHERE points_earned = 0 OR points_earned IS NULL;

-- Ensure all existing users have proper user_stats records
INSERT INTO user_stats (user_id, challenges_completed, labs_completed, total_points, badge_count, created_at, updated_at)
SELECT 
  p.id,
  COALESCE((SELECT COUNT(*) FROM challenge_completions cc WHERE cc.user_id = p.id), 0),
  COALESCE((SELECT COUNT(*) FROM lab_completions lc WHERE lc.user_id = p.id), 0),
  COALESCE((SELECT SUM(up.points) FROM user_points up WHERE up.user_id = p.id), 0),
  COALESCE((SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id), 0),
  p.created_at,
  NOW()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats us WHERE us.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;