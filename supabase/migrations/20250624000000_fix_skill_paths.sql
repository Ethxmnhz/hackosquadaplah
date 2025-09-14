/*
  # Fix Skill Paths Schema

  1. Purpose
    - Fix foreign key relationships for skill paths
    - Add proper constraints and indexes
    - Ensure data integrity

  2. Changes
    - Add foreign key constraints for skill_path_items
    - Add enrolled_count column to skill_paths
    - Add proper indexes
    - Update RLS policies
*/

-- Add enrolled_count column to skill_paths
ALTER TABLE skill_paths ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0;

-- Create function to update enrolled count
CREATE OR REPLACE FUNCTION update_skill_path_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE skill_paths 
        SET enrolled_count = enrolled_count + 1 
        WHERE id = NEW.skill_path_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE skill_paths 
        SET enrolled_count = enrolled_count - 1 
        WHERE id = OLD.skill_path_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for enrolled count
DROP TRIGGER IF EXISTS skill_path_enrolled_count_trigger ON skill_path_progress;
CREATE TRIGGER skill_path_enrolled_count_trigger
    AFTER INSERT OR DELETE ON skill_path_progress
    FOR EACH ROW EXECUTE FUNCTION update_skill_path_enrolled_count();

-- Add admin policies for skill paths management
CREATE POLICY IF NOT EXISTS "Admins can manage all skill paths"
  ON skill_paths
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can manage all skill path items"
  ON skill_path_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_skill_path_items_item_type_id ON skill_path_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_skill_path_progress_user_path ON skill_path_progress(user_id, skill_path_id);

-- Update RLS policies to allow admins to see all skill paths
DROP POLICY IF EXISTS "Skill paths are viewable by everyone" ON skill_paths;
CREATE POLICY "Skill paths are viewable by everyone" ON skill_paths
    FOR SELECT USING (
        is_published = true 
        OR auth.uid() = created_by 
        OR EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.id = auth.uid()
        )
    );

-- Update skill_path_items visibility policy
DROP POLICY IF EXISTS "Skill path items are viewable by everyone" ON skill_path_items;
CREATE POLICY "Skill path items are viewable by everyone" ON skill_path_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM skill_paths 
            WHERE skill_paths.id = skill_path_items.skill_path_id 
            AND (
                skill_paths.is_published = true 
                OR skill_paths.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM admin_users 
                    WHERE admin_users.id = auth.uid()
                )
            )
        )
    );

-- Create function to get skill path with items (for better performance)
CREATE OR REPLACE FUNCTION get_skill_path_with_items(skill_path_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    short_description TEXT,
    difficulty TEXT,
    estimated_duration INTEGER,
    total_points INTEGER,
    category TEXT,
    prerequisites TEXT[],
    learning_objectives TEXT[],
    cover_image TEXT,
    is_published BOOLEAN,
    enrolled_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID,
    item_id UUID,
    item_type TEXT,
    item_order INTEGER,
    item_required BOOLEAN,
    item_unlock_after TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.title,
        sp.description,
        sp.short_description,
        sp.difficulty,
        sp.estimated_duration,
        sp.total_points,
        sp.category,
        sp.prerequisites,
        sp.learning_objectives,
        sp.cover_image,
        sp.is_published,
        sp.enrolled_count,
        sp.created_at,
        sp.updated_at,
        sp.created_by,
        spi.item_id,
        spi.item_type,
        spi.order_index as item_order,
        spi.is_required as item_required,
        spi.unlock_after as item_unlock_after
    FROM skill_paths sp
    LEFT JOIN skill_path_items spi ON sp.id = spi.skill_path_id
    WHERE sp.id = skill_path_id
    ORDER BY spi.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_skill_path_with_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_skill_path_with_items(UUID) TO anon;
