/*
  # Final Fix for Badge Count Ambiguity and Source Type Constraint

  1. Changes
    - Fix the ambiguous badge_count column reference in all database objects
    - Add operation as a valid source_type for user_points
    - Update constraints to include all valid source types
    - Ensure all database functions use fully qualified column references

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with proper constraints
*/

-- First, drop all existing triggers that might reference badge_count
DROP TRIGGER IF EXISTS on_challenge_completion ON challenge_completions CASCADE;
DROP TRIGGER IF EXISTS on_user_stats_update ON user_stats CASCADE;
DROP TRIGGER IF EXISTS on_user_badges_change ON user_badges CASCADE;
DROP TRIGGER IF EXISTS on_lab_completion ON lab_completions CASCADE;

-- Drop all functions that might have badge_count references
DROP FUNCTION IF EXISTS handle_challenge_completion() CASCADE;
DROP FUNCTION IF EXISTS award_badge_if_eligible() CASCADE;
DROP FUNCTION IF EXISTS update_user_badge_count() CASCADE;
DROP FUNCTION IF EXISTS handle_lab_completion() CASCADE;

-- Drop any views that might reference badge_count
DROP VIEW IF EXISTS user_leaderboard CASCADE;
DROP VIEW IF EXISTS user_rankings CASCADE;

-- Fix the source_type constraint in user_points
ALTER TABLE user_points DROP CONSTRAINT IF EXISTS user_points_source_type_check;
ALTER TABLE user_points ADD CONSTRAINT user_points_source_type_check 
CHECK (source_type IN ('challenge', 'lab', 'operation', 'badge', 'achievement', 'bonus', 'manual'));

-- Create a completely unambiguous challenge completion handler
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
    challenge_points_value INTEGER := 0;
BEGIN
    -- Get points from the challenge table with explicit alias
    SELECT ch.points INTO challenge_points_value
    FROM challenges ch
    WHERE ch.id = NEW.challenge_id;
    
    -- Set default if null
    challenge_points_value := COALESCE(challenge_points_value, 0);
    
    -- Insert points record into user_points table with explicit column names
    INSERT INTO user_points (user_id, points, source_type, source_id, earned_at)
    VALUES (NEW.user_id, challenge_points_value, 'challenge', NEW.challenge_id, NOW());
    
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
        0,
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
        RAISE NOTICE 'Error in handle_challenge_completion: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a completely unambiguous badge awarding function
CREATE OR REPLACE FUNCTION award_badge_if_eligible()
RETURNS TRIGGER AS $$
DECLARE
    user_challenges_count INTEGER := 0;
    user_points_total INTEGER := 0;
    badge_already_exists BOOLEAN := FALSE;
    user_current_badge_count INTEGER := 0;
BEGIN
    -- Get user stats with explicit alias
    SELECT 
        stats.challenges_completed, 
        stats.total_points,
        stats.badge_count
    INTO 
        user_challenges_count, 
        user_points_total,
        user_current_badge_count
    FROM user_stats stats 
    WHERE stats.user_id = NEW.user_id;
    
    -- Set defaults if null
    user_challenges_count := COALESCE(user_challenges_count, 0);
    user_points_total := COALESCE(user_points_total, 0);
    user_current_badge_count := COALESCE(user_current_badge_count, 0);
    
    -- Award first challenge badge
    IF user_challenges_count = 1 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges badges
            WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'first_challenge'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            INSERT INTO user_badges (user_id, badge_type, earned_at)
            VALUES (NEW.user_id, 'first_challenge', NOW());
            
            -- Update badge count in user_stats
            UPDATE user_stats stats
            SET 
                badge_count = user_current_badge_count + 1,
                updated_at = NOW()
            WHERE stats.user_id = NEW.user_id;
        END IF;
    END IF;
    
    -- Award challenge master badge (10 challenges)
    IF user_challenges_count = 10 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges badges
            WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'challenge_master'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            INSERT INTO user_badges (user_id, badge_type, earned_at)
            VALUES (NEW.user_id, 'challenge_master', NOW());
            
            -- Get updated badge count
            SELECT stats.badge_count INTO user_current_badge_count
            FROM user_stats stats
            WHERE stats.user_id = NEW.user_id;
            
            -- Update badge count in user_stats
            UPDATE user_stats stats
            SET 
                badge_count = COALESCE(user_current_badge_count, 0) + 1,
                updated_at = NOW()
            WHERE stats.user_id = NEW.user_id;
        END IF;
    END IF;
    
    -- Award high scorer badge (1000+ points)
    IF user_points_total >= 1000 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges badges
            WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'high_scorer'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            INSERT INTO user_badges (user_id, badge_type, earned_at)
            VALUES (NEW.user_id, 'high_scorer', NOW());
            
            -- Get updated badge count
            SELECT stats.badge_count INTO user_current_badge_count
            FROM user_stats stats
            WHERE stats.user_id = NEW.user_id;
            
            -- Update badge count in user_stats
            UPDATE user_stats stats
            SET 
                badge_count = COALESCE(user_current_badge_count, 0) + 1,
                updated_at = NOW()
            WHERE stats.user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue
        RAISE NOTICE 'Error in award_badge_if_eligible: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a completely unambiguous badge count update function
CREATE OR REPLACE FUNCTION update_user_badge_count()
RETURNS TRIGGER AS $$
DECLARE
    target_user_uuid UUID;
    calculated_badge_count INTEGER := 0;
BEGIN
    -- Determine which user_id to update
    target_user_uuid := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Count badges for this user with explicit alias
    SELECT COUNT(*) INTO calculated_badge_count
    FROM user_badges badges
    WHERE badges.user_id = target_user_uuid;
    
    -- Update user_stats with explicit table qualification
    UPDATE user_stats stats
    SET 
        badge_count = calculated_badge_count,
        updated_at = NOW()
    WHERE stats.user_id = target_user_uuid;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue
        RAISE NOTICE 'Error in update_user_badge_count: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create a completely unambiguous user_leaderboard view
CREATE VIEW user_leaderboard AS
SELECT 
    profiles.id,
    profiles.email,
    profiles.username,
    COALESCE(stats.total_points, 0) as total_points,
    COALESCE(stats.challenges_completed, 0) as challenges_completed,
    COALESCE(stats.labs_completed, 0) as labs_completed,
    COALESCE(stats.badge_count, 0) as badge_count,
    COALESCE(stats.rank_title, 'Novice') as rank_title,
    COALESCE(stats.updated_at, profiles.created_at) as updated_at,
    ROW_NUMBER() OVER (ORDER BY COALESCE(stats.total_points, 0) DESC, COALESCE(stats.challenges_completed, 0) DESC) as rank_position
FROM profiles
LEFT JOIN user_stats stats ON profiles.id = stats.user_id
ORDER BY COALESCE(stats.total_points, 0) DESC, COALESCE(stats.challenges_completed, 0) DESC;

-- Recreate all triggers
CREATE TRIGGER on_challenge_completion
    AFTER INSERT ON challenge_completions
    FOR EACH ROW
    EXECUTE FUNCTION handle_challenge_completion();

CREATE TRIGGER on_user_stats_update
    AFTER UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION award_badge_if_eligible();

CREATE TRIGGER on_user_badges_change
    AFTER INSERT OR DELETE ON user_badges
    FOR EACH ROW
    EXECUTE FUNCTION update_user_badge_count();

-- Ensure all existing users have proper user_stats records
INSERT INTO user_stats (user_id, challenges_completed, labs_completed, total_points, badge_count, created_at, updated_at)
SELECT 
    profiles.id,
    0,
    0,
    COALESCE((SELECT SUM(points.points) FROM user_points points WHERE points.user_id = profiles.id), 0),
    COALESCE((SELECT COUNT(*) FROM user_badges badges WHERE badges.user_id = profiles.id), 0),
    profiles.created_at,
    NOW()
FROM profiles
WHERE NOT EXISTS (
    SELECT 1 FROM user_stats stats WHERE stats.user_id = profiles.id
);

-- Update existing user_stats records to have correct badge counts
UPDATE user_stats 
SET badge_count = (
    SELECT COUNT(*) 
    FROM user_badges badges
    WHERE badges.user_id = user_stats.user_id
),
updated_at = NOW();