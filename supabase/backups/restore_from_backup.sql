-- Script to restore from backup tables
-- Run this to recover data after an accidental deletion

-- First, check what data exists in the backup tables
DO $$
DECLARE
  lab_backup_count INTEGER := 0;
  challenge_backup_count INTEGER := 0;
  operation_backup_count INTEGER := 0;
  request_backup_count INTEGER := 0;
  session_backup_count INTEGER := 0;
  profile_backup_count INTEGER := 0;
  admin_backup_count INTEGER := 0;
  
  lab_count INTEGER := 0;
  challenge_count INTEGER := 0;
  operation_count INTEGER := 0;
  request_count INTEGER := 0;
  session_count INTEGER := 0;
  profile_count INTEGER := 0;
  admin_count INTEGER := 0;
BEGIN
  -- Check if backup tables exist
  BEGIN
    SELECT COUNT(*) INTO lab_backup_count FROM labs_backup;
    EXCEPTION WHEN undefined_table THEN lab_backup_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO challenge_backup_count FROM challenges_backup;
    EXCEPTION WHEN undefined_table THEN challenge_backup_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO operation_backup_count FROM New_operation_backup;
    EXCEPTION WHEN undefined_table THEN operation_backup_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO request_backup_count FROM match_requests_backup;
    EXCEPTION WHEN undefined_table THEN request_backup_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO session_backup_count FROM lab_sessions_backup;
    EXCEPTION WHEN undefined_table THEN session_backup_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO profile_backup_count FROM profiles_backup;
    EXCEPTION WHEN undefined_table THEN profile_backup_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO admin_backup_count FROM admin_users_backup;
    EXCEPTION WHEN undefined_table THEN admin_backup_count := -1;
  END;
  
  -- Check current counts
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
  
  BEGIN
    SELECT COUNT(*) INTO request_count FROM match_requests;
    EXCEPTION WHEN undefined_table THEN request_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO session_count FROM lab_sessions;
    EXCEPTION WHEN undefined_table THEN session_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    EXCEPTION WHEN undefined_table THEN profile_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    EXCEPTION WHEN undefined_table THEN admin_count := -1;
  END;
  
  -- Output the backup information
  RAISE NOTICE 'Backup data available:';
  RAISE NOTICE '- labs: % records (current: %)', 
    CASE WHEN lab_backup_count = -1 THEN 'table missing' ELSE lab_backup_count::text END,
    CASE WHEN lab_count = -1 THEN 'table missing' ELSE lab_count::text END;
  RAISE NOTICE '- challenges: % records (current: %)', 
    CASE WHEN challenge_backup_count = -1 THEN 'table missing' ELSE challenge_backup_count::text END,
    CASE WHEN challenge_count = -1 THEN 'table missing' ELSE challenge_count::text END;
  RAISE NOTICE '- operations: % records (current: %)', 
    CASE WHEN operation_backup_count = -1 THEN 'table missing' ELSE operation_backup_count::text END,
    CASE WHEN operation_count = -1 THEN 'table missing' ELSE operation_count::text END;
  RAISE NOTICE '- match requests: % records (current: %)', 
    CASE WHEN request_backup_count = -1 THEN 'table missing' ELSE request_backup_count::text END,
    CASE WHEN request_count = -1 THEN 'table missing' ELSE request_count::text END;
  RAISE NOTICE '- lab sessions: % records (current: %)', 
    CASE WHEN session_backup_count = -1 THEN 'table missing' ELSE session_backup_count::text END,
    CASE WHEN session_count = -1 THEN 'table missing' ELSE session_count::text END;
  RAISE NOTICE '- profiles: % records (current: %)', 
    CASE WHEN profile_backup_count = -1 THEN 'table missing' ELSE profile_backup_count::text END,
    CASE WHEN profile_count = -1 THEN 'table missing' ELSE profile_count::text END;
  RAISE NOTICE '- admin users: % records (current: %)', 
    CASE WHEN admin_backup_count = -1 THEN 'table missing' ELSE admin_backup_count::text END,
    CASE WHEN admin_count = -1 THEN 'table missing' ELSE admin_count::text END;
END $$;

-- !!!! IMPORTANT !!!!
-- Uncomment the following sections as needed to restore data
-- Be careful to only restore what you need to avoid duplicate data

-- Restore labs data if needed
/*
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM labs) = 0 AND (SELECT COUNT(*) FROM labs_backup) > 0 THEN
    INSERT INTO labs SELECT * FROM labs_backup;
    RAISE NOTICE 'Restored % labs from backup', (SELECT COUNT(*) FROM labs);
  ELSE
    RAISE NOTICE 'Labs table already has data or backup is empty - skipping restore';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE EXCEPTION 'Either labs or labs_backup table does not exist';
END $$;
*/

-- Restore challenges data if needed
/*
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM challenges) = 0 AND (SELECT COUNT(*) FROM challenges_backup) > 0 THEN
    INSERT INTO challenges SELECT * FROM challenges_backup;
    RAISE NOTICE 'Restored % challenges from backup', (SELECT COUNT(*) FROM challenges);
  ELSE
    RAISE NOTICE 'Challenges table already has data or backup is empty - skipping restore';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE EXCEPTION 'Either challenges or challenges_backup table does not exist';
END $$;
*/

-- Restore operations data if needed
/*
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM New_operation) = 0 AND (SELECT COUNT(*) FROM New_operation_backup) > 0 THEN
    INSERT INTO New_operation SELECT * FROM New_operation_backup;
    RAISE NOTICE 'Restored % operations from backup', (SELECT COUNT(*) FROM New_operation);
  ELSE
    RAISE NOTICE 'New_operation table already has data or backup is empty - skipping restore';
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE EXCEPTION 'Either New_operation or New_operation_backup table does not exist';
END $$;
*/
