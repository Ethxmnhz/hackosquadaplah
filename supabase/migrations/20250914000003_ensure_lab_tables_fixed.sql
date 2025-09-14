-- Migration: Create missing tables and fix foreign keys
-- This migration ensures we have both labs and New_operation tables for lab references

-- First, create the labs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Insert a placeholder lab if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.labs LIMIT 1) THEN
    INSERT INTO public.labs (id, name, description)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Default Lab',
      'Default lab created by migration'
    );
  END IF;
END $$;

-- Create New_operation table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.New_operation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Insert a placeholder operation if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.New_operation LIMIT 1) THEN
    INSERT INTO public.New_operation (id, name, description)
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      'Default Operation',
      'Default operation created by migration'
    );
  END IF;
END $$;

-- Grant permissions on these tables
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.labs TO authenticated;

ALTER TABLE public.New_operation ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.New_operation TO authenticated;

-- Create default select policies (drop first to avoid errors if they already exist)
DO $$
BEGIN
  -- For labs table
  BEGIN
    DROP POLICY IF EXISTS "Users can view labs" ON public.labs;
  EXCEPTION WHEN OTHERS THEN
    -- Policy doesn't exist, ignore error
  END;
  
  -- For New_operation table
  BEGIN
    DROP POLICY IF EXISTS "Users can view operations" ON public.New_operation;
  EXCEPTION WHEN OTHERS THEN
    -- Policy doesn't exist, ignore error
  END;
END $$;

-- Create policies (without IF NOT EXISTS)
CREATE POLICY "Users can view labs"
  ON public.labs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view operations"
  ON public.New_operation
  FOR SELECT
  TO authenticated
  USING (true);
