-- Fix the source_type constraint in user_points to allow 'operation' as a valid source type
ALTER TABLE user_points DROP CONSTRAINT IF EXISTS user_points_source_type_check;
ALTER TABLE user_points ADD CONSTRAINT user_points_source_type_check 
CHECK (source_type IN ('challenge', 'lab', 'operation', 'badge', 'achievement', 'bonus', 'manual'));

-- Create a completely unambiguous challenge completion handler with proper error handling
CREATE OR REPLACE FUNCTION handle_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
    challenge_points_value INTEGER := 0;
    user_badge_count INTEGER := 0;
BEGIN
    -- Get points from the challenge table with explicit alias
    SELECT ch.points INTO challenge_points_value
    FROM challenges ch
    WHERE ch.id = NEW.challenge_id;
    
    -- Set default if null
    challenge_points_value := COALESCE(challenge_points_value, 0);
    
    -- Get current badge count for this user
    SELECT us.badge_count INTO user_badge_count
    FROM user_stats us
    WHERE us.user_id = NEW.user_id;
    
    user_badge_count := COALESCE(user_badge_count, 0);
    
    -- Insert points record into user_points table with explicit column names
    BEGIN
        INSERT INTO user_points (user_id, points, source_type, source_id, earned_at)
        VALUES (NEW.user_id, challenge_points_value, 'challenge', NEW.challenge_id, NOW());
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting into user_points: %', SQLERRM;
    END;
    
    -- Update user_stats table with completely explicit references
    BEGIN
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
            user_badge_count,
            NOW(), 
            NOW()
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            challenges_completed = user_stats.challenges_completed + 1,
            total_points = user_stats.total_points + challenge_points_value,
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating user_stats: %', SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue
        RAISE NOTICE 'Error in handle_challenge_completion: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a completely unambiguous badge awarding function with proper error handling
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
            BEGIN
                INSERT INTO user_badges (user_id, badge_type, earned_at)
                VALUES (NEW.user_id, 'first_challenge', NOW());
                
                -- Update badge count in user_stats
                UPDATE user_stats stats
                SET 
                    badge_count = user_current_badge_count + 1,
                    updated_at = NOW()
                WHERE stats.user_id = NEW.user_id;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error awarding first_challenge badge: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    -- Award challenge master badge (10 challenges)
    IF user_challenges_count = 10 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges badges
            WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'challenge_master'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error awarding challenge_master badge: %', SQLERRM;
            END;
        END IF;
    END IF;
    
    -- Award high scorer badge (1000+ points)
    IF user_points_total >= 1000 THEN
        SELECT EXISTS(
            SELECT 1 FROM user_badges badges
            WHERE badges.user_id = NEW.user_id AND badges.badge_type = 'high_scorer'
        ) INTO badge_already_exists;
        
        IF NOT badge_already_exists THEN
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error awarding high_scorer badge: %', SQLERRM;
            END;
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

-- Create a completely unambiguous badge count update function with proper error handling
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
    BEGIN
        UPDATE user_stats stats
        SET 
            badge_count = calculated_badge_count,
            updated_at = NOW()
        WHERE stats.user_id = target_user_uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error updating badge count: %', SQLERRM;
    END;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue
        RAISE NOTICE 'Error in update_user_badge_count: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_challenge_completion ON challenge_completions;
DROP TRIGGER IF EXISTS on_user_stats_update ON user_stats;
DROP TRIGGER IF EXISTS on_user_badges_change ON user_badges;

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

-- Add additional metadata fields to challenges table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'short_description'
    ) THEN
        ALTER TABLE challenges ADD COLUMN short_description text;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'scenario'
    ) THEN
        ALTER TABLE challenges ADD COLUMN scenario text;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'learning_objectives'
    ) THEN
        ALTER TABLE challenges ADD COLUMN learning_objectives text[];
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'tools_required'
    ) THEN
        ALTER TABLE challenges ADD COLUMN tools_required text[];
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'references'
    ) THEN
        ALTER TABLE challenges ADD COLUMN references text[];
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'prerequisites'
    ) THEN
        ALTER TABLE challenges ADD COLUMN prerequisites text[];
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'target_audience'
    ) THEN
        ALTER TABLE challenges ADD COLUMN target_audience text;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'estimated_time'
    ) THEN
        ALTER TABLE challenges ADD COLUMN estimated_time integer;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'challenges' AND column_name = 'author_notes'
    ) THEN
        ALTER TABLE challenges ADD COLUMN author_notes text;
    END IF;
END $$;