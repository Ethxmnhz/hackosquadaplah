-- UNDO Migration: Fix admin permissions
-- Description: This script reverses the effects of the 20250914000005_fix_admin_permissions.sql migration

-- First, check the status of key tables
DO $$
DECLARE
  lab_count integer;
  challenge_count integer;
  operation_count integer;
BEGIN
  -- Check if tables exist and have data
  BEGIN
    SELECT COUNT(*) INTO lab_count FROM labs;
    EXCEPTION WHEN undefined_table THEN lab_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO challenge_count FROM challenges;
    EXCEPTION WHEN undefined_table THEN challenge_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO operation_count FROM New_operation;
    EXCEPTION WHEN undefined_table THEN operation_count := -1;
  END;
  
  RAISE NOTICE 'CURRENT DATABASE STATUS:';
  RAISE NOTICE '- Labs: %', CASE WHEN lab_count = -1 THEN 'TABLE MISSING' WHEN lab_count = 0 THEN 'EMPTY' ELSE lab_count::text || ' records' END;
  RAISE NOTICE '- Challenges: %', CASE WHEN challenge_count = -1 THEN 'TABLE MISSING' WHEN challenge_count = 0 THEN 'EMPTY' ELSE challenge_count::text || ' records' END;
  RAISE NOTICE '- Operations: %', CASE WHEN operation_count = -1 THEN 'TABLE MISSING' WHEN operation_count = 0 THEN 'EMPTY' ELSE operation_count::text || ' records' END;
END $$;

-- Since we know the issue is with the admin_users table, let's restore the original behavior
-- This will add the first user as admin, restoring the original functionality

-- First, clear the admin_users table to start fresh
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_users'
  ) THEN
    -- Only clear admin_users if it exists
    DELETE FROM admin_users;
    RAISE NOTICE 'Cleared admin_users table';
    
    -- Add the first user in profiles as admin (original behavior)
    INSERT INTO admin_users (id)
    SELECT id FROM profiles
    ORDER BY created_at
    LIMIT 1
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Restored original admin user';
  END IF;
END $$;

-- Restore the original auto-add admin function
CREATE OR REPLACE FUNCTION public.auto_add_first_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If no admins exist, add the first user as admin
  IF NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1) THEN
    INSERT INTO admin_users (id)
    SELECT id FROM profiles LIMIT 1
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Check what admins we have now
DO $$
DECLARE
  admin_count integer;
  admin_email text;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM admin_users;
  
  -- Get the email of the admin if there is one
  BEGIN
    SELECT p.email INTO admin_email
    FROM admin_users a
    JOIN profiles p ON a.id = p.id
    LIMIT 1;
    EXCEPTION WHEN undefined_column THEN admin_email := 'Email not available';
  END;
  
  RAISE NOTICE 'ADMIN STATUS AFTER RESTORE:';
  RAISE NOTICE '- Admin count: %', admin_count;
  IF admin_count > 0 THEN
    RAISE NOTICE '- First admin email: %', admin_email;
  END IF;
END $$;
