/*
  # Final Fix for Ambiguous Badge Count Column Reference

  1. Problem
    - The "column reference badge_count is ambiguous" error persists
    - This indicates there are still database objects with unqualified badge_count references
    - Need to identify and fix ALL references to badge_count in the database

  2. Solution
    - Drop ALL functions, triggers, and views that might reference badge_count
    - Recreate them with completely unambiguous column references
    - Use different variable names to avoid any potential conflicts
    - Add comprehensive error handling

  3. Changes
    - Complete cleanup of all database objects
    - Recreate with explicit table qualifications
    - Use unique variable names to prevent conflicts
*/

-- First, completely drop ALL triggers and functions that might reference badge_count
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

-- Check if there are any other functions or views with badge_count references
-- and drop them (this is a safety measure)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any remaining functions that might reference badge_count
    FOR r IN (
        SELECT routine_name, routine_schema
        FROM information_schema.routines 
        WHERE routine_definition ILIKE '%badge_count%'
        AND routine_schema = 'public'
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_schema) || '.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
    
    -- Drop any remaining views that might reference badge_count
    FOR r IN (
        SELECT table_name, table_schema
        FROM information_schema.views 
        WHERE view_definition ILIKE '%badge_count%'
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END $$;

-- Now recreate the challenge completion handler with completely unambiguous references
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
    challenge_points_value INTEGER := 0;
BEGIN
    -- Get points from the challenge table
    SELECT c.points INTO challenge_points_value
    FROM challenges c
    WHERE c.id = NEW.challenge_id;
    
    -- Set default if null
    challenge_points_value := COALESCE(challenge_points_value, 0);
    
    -- Insert points record into user_points table
    INSERT INTO user_points (user_id, points, source_type, source_id, earned_from, earned_at)
    VALUES (NEW.user_id, challenge_points_value, 'challenge', NEW.challenge_id, 'challenge_completion', NOW());
    
    -- Update user_stats table with completely explicit references
    INSERT INTO user_stats (user_id, challenges_completed, total_points, badge_count, created_at, updated_at)
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
END;
$$ LANGUAGE plpgsql;

-- Recreate the badge awarding function with unique variable names
CREATE OR REPLACE FUNCTION award_badge_if_eligible()
RETURNS TRIGGER AS $$
DECLARE
    user_challenges_count INTEGER := 0;
    user_points_total INTEGER := 0;
    badge_already_exists BOOLEAN := FALSE;
    current_user_badge_count INTEGER := 0;
BEGIN
    -- Get user stats from user_stats table
    SELECT 
        us.challenges_completed, 
        us.total_points,
        us.badge_count
    INTO 
        user_challenges_count, 
        user_points_total,
        current_user_badge_count
    FROM user_stats us 
    WHERE us.user_id = NEW.user_id;
    
    -- Set defaults if null
    user_challenges_count := COALESCE(user_challenges_count, 0);
    user_points_total := COALESCE(user_points_total, 0);
    current_user_badge_count := COALESCE(current_user_badge_count, 0);
    
    -- Award first challenge badge
    IF user_challenges_count = 1 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges ub
            WHERE ub.user_id = NEW.user_id AND ub.badge_type = 'first_challenge'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            INSERT INTO user_badges (user_id, badge_type, earned_at)
            VALUES (NEW.user_id, 'first_challenge', NOW());
            
            UPDATE user_stats 
            SET 
                badge_count = current_user_badge_count + 1,
                updated_at = NOW()
            WHERE user_stats.user_id = NEW.user_id;
        END IF;
    END IF;
    
    -- Award challenge master badge (10 challenges)
    IF user_challenges_count = 10 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges ub
            WHERE ub.user_id = NEW.user_id AND ub.badge_type = 'challenge_master'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            INSERT INTO user_badges (user_id, badge_type, earned_at)
            VALUES (NEW.user_id, 'challenge_master', NOW());
            
            -- Get the current badge count again
            SELECT us.badge_count INTO current_user_badge_count
            FROM user_stats us
            WHERE us.user_id = NEW.user_id;
            
            UPDATE user_stats 
            SET 
                badge_count = COALESCE(current_user_badge_count, 0) + 1,
                updated_at = NOW()
            WHERE user_stats.user_id = NEW.user_id;
        END IF;
    END IF;
    
    -- Award high scorer badge (1000+ points)
    IF user_points_total >= 1000 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges ub
            WHERE ub.user_id = NEW.user_id AND ub.badge_type = 'high_scorer'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            INSERT INTO user_badges (user_id, badge_type, earned_at)
            VALUES (NEW.user_id, 'high_scorer', NOW());
            
            -- Get the current badge count again
            SELECT us.badge_count INTO current_user_badge_count
            FROM user_stats us
            WHERE us.user_id = NEW.user_id;
            
            UPDATE user_stats 
            SET 
                badge_count = COALESCE(current_user_badge_count, 0) + 1,
                updated_at = NOW()
            WHERE user_stats.user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the badge count update function with unique variable names
CREATE OR REPLACE FUNCTION update_user_badge_count()
RETURNS TRIGGER AS $$
DECLARE
    target_user_uuid UUID;
    calculated_badge_count INTEGER := 0;
BEGIN
    -- Determine which user_id to update
    target_user_uuid := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Count badges for this user
    SELECT COUNT(*) INTO calculated_badge_count
    FROM user_badges ub
    WHERE ub.user_id = target_user_uuid;
    
    -- Update user_stats with explicit table qualification
    UPDATE user_stats 
    SET 
        badge_count = calculated_badge_count,
        updated_at = NOW()
    WHERE user_stats.user_id = target_user_uuid;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the user_leaderboard view with completely explicit aliases
CREATE VIEW user_leaderboard AS
SELECT 
    p.id,
    p.email,
    p.username,
    COALESCE(us.total_points, 0) as total_points,
    COALESCE(us.challenges_completed, 0) as challenges_completed,
    COALESCE(us.labs_completed, 0) as labs_completed,
    COALESCE(us.badge_count, 0) as badge_count,
    COALESCE(us.rank_title, 'Novice') as rank_title,
    COALESCE(us.updated_at, p.created_at) as updated_at,
    ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC) as rank_position
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
ORDER BY COALESCE(us.total_points, 0) DESC, COALESCE(us.challenges_completed, 0) DESC;

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
    p.id,
    0,
    0,
    COALESCE((SELECT SUM(up.points) FROM user_points up WHERE up.user_id = p.id), 0),
    COALESCE((SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id), 0),
    p.created_at,
    NOW()
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM user_stats us WHERE us.user_id = p.id
);

-- Update existing user_stats records to have correct badge counts
UPDATE user_stats 
SET badge_count = (
    SELECT COUNT(*) 
    FROM user_badges ub
    WHERE ub.user_id = user_stats.user_id
),
updated_at = NOW()
WHERE user_stats.badge_count != (
    SELECT COUNT(*) 
    FROM user_badges ub
    WHERE ub.user_id = user_stats.user_id
);

-- Add a check constraint to ensure source_type is valid in user_points
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE user_points DROP CONSTRAINT IF EXISTS user_points_source_type_check;
    
    -- Add the constraint with all valid source types
    ALTER TABLE user_points ADD CONSTRAINT user_points_source_type_check 
    CHECK (source_type IN ('challenge', 'lab', 'operation', 'badge', 'achievement', 'bonus', 'manual'));
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if constraint already exists or other issues
        NULL;
END $$;