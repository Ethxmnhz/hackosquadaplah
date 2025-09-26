-- Migration: Fix skill_paths / certification visibility policies after admin_users removal
-- Date: 2025-09-26
-- Problem: Existing policies referenced admin_users (now dropped) causing SELECT to fail or return zero rows
-- Solution: Replace policies with simplified public read (published or owner) and owner manage policies.

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.skill_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_path_items ENABLE ROW LEVEL SECURITY;

-- Drop legacy / admin-dependent policies if present
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN (
    SELECT policyname, tablename FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename IN ('skill_paths','skill_path_items')
      AND policyname IN (
        'Skill paths are viewable by everyone',
        'Skill path items are viewable by everyone',
        'Admins can manage all skill paths',
        'Admins can manage all skill path items'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Recreate SELECT policies (public read of published, or owner)
CREATE POLICY "Skill paths are viewable by everyone" ON public.skill_paths
  FOR SELECT USING (is_published = true OR auth.uid() = created_by);

CREATE POLICY "Skill path items are viewable by everyone" ON public.skill_path_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.skill_paths sp
      WHERE sp.id = skill_path_items.skill_path_id
        AND (sp.is_published = true OR sp.created_by = auth.uid())
    )
  );

-- Owner manage policies (leave existing ones intact if already present; create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='skill_paths' AND policyname='Users can create skill paths'
  ) THEN
    CREATE POLICY "Users can create skill paths" ON public.skill_paths
      FOR INSERT WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='skill_paths' AND policyname='Users can update their own skill paths'
  ) THEN
    CREATE POLICY "Users can update their own skill paths" ON public.skill_paths
      FOR UPDATE USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='skill_paths' AND policyname='Users can delete their own skill paths'
  ) THEN
    CREATE POLICY "Users can delete their own skill paths" ON public.skill_paths
      FOR DELETE USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='skill_path_items' AND policyname='Users can manage items of their skill paths'
  ) THEN
    CREATE POLICY "Users can manage items of their skill paths" ON public.skill_path_items
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.skill_paths sp
          WHERE sp.id = skill_path_items.skill_path_id
            AND sp.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- Optional: grant read privileges (RLS still governs rows)
GRANT SELECT ON public.skill_paths TO authenticated, anon;
GRANT SELECT ON public.skill_path_items TO authenticated, anon;

-- Verification suggestions (run manually after apply):
-- SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='skill_paths';
-- SELECT count(*) FROM public.skill_paths WHERE is_published = true; -- Expect > 0
-- Test from client: should now see certifications (skill paths) again.
