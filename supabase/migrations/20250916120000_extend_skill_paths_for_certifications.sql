-- Migration: Extend skill_paths table to support certification features
-- Created at: 2025-09-16

-- 1. New columns (added as NULLable first for safe rollout; enforce constraints later if desired)
ALTER TABLE public.skill_paths
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS certificate_image_url text,
  ADD COLUMN IF NOT EXISTS exam_type text, -- expectation: challenge_bundle | timed_exam | lab_practical | hybrid
  ADD COLUMN IF NOT EXISTS exam_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS passing_score_percent integer,
  ADD COLUMN IF NOT EXISTS max_attempts integer,
  ADD COLUMN IF NOT EXISTS cooldown_hours_between_attempts integer,
  ADD COLUMN IF NOT EXISTS validity_period_days integer,
  ADD COLUMN IF NOT EXISTS recommended_experience text,
  ADD COLUMN IF NOT EXISTS delivery_mode text, -- proctored | unproctored | auto
  ADD COLUMN IF NOT EXISTS certificate_title_override text,
  ADD COLUMN IF NOT EXISTS certificate_subtitle text,
  ADD COLUMN IF NOT EXISTS issuer_name text,
  ADD COLUMN IF NOT EXISTS issuer_signature_url text,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 2. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS skill_paths_code_key ON public.skill_paths (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS skill_paths_is_featured_idx ON public.skill_paths (is_featured);
CREATE INDEX IF NOT EXISTS skill_paths_exam_type_idx ON public.skill_paths (exam_type);

-- 3. (Optional) Basic check constraints (non-enforced for existing NULL values)
ALTER TABLE public.skill_paths
  ADD CONSTRAINT skill_paths_passing_score_range CHECK (passing_score_percent IS NULL OR (passing_score_percent >= 1 AND passing_score_percent <= 100));

-- 4. Future enhancements (Left as comments for later migrations):
-- * Add table certification_exam_sessions for tracking attempts
-- * Add table certification_awards for issued certificates
-- * Add structured prerequisites table instead of free-text prerequisites array

-- ROLLBACK (manual):
-- ALTER TABLE public.skill_paths DROP COLUMN code, DROP COLUMN icon_url, ... (list all) ;
