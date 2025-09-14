-- Migration: ASSESSMENT ONLY - Check database status
-- Description: This migration does NOT modify any data - it only checks what exists and what's missing

-- This is a diagnostic-only script that will report on the state of your tables
-- After running this, you can decide what recovery steps to take

DO $$
DECLARE
  lab_count integer;
  challenge_count integer;
  operation_count integer;
  has_lab_backup boolean;
  has_challenge_backup boolean;
  has_operation_backup boolean;
  backup_lab_count integer := 0;
  backup_challenge_count integer := 0;
  backup_operation_count integer := 0;
BEGIN
  -- Check if current tables are empty
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
  
  -- Check if backup tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'labs_backup'
  ) INTO has_lab_backup;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'challenges_backup'
  ) INTO has_challenge_backup;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'New_operation_backup'
  ) INTO has_operation_backup;
  
  -- Check counts in backup tables if they exist
  IF has_lab_backup THEN
    SELECT COUNT(*) INTO backup_lab_count FROM labs_backup;
  END IF;
  
  IF has_challenge_backup THEN
    SELECT COUNT(*) INTO backup_challenge_count FROM challenges_backup;
  END IF;
  
  IF has_operation_backup THEN
    SELECT COUNT(*) INTO backup_operation_count FROM New_operation_backup;
  END IF;
  
  -- Output the status of all tables
  RAISE NOTICE 'DATABASE STATUS REPORT:';
  RAISE NOTICE '-------------------';
  RAISE NOTICE 'Labs table: % records', 
    CASE 
      WHEN lab_count = -1 THEN 'TABLE DOES NOT EXIST' 
      WHEN lab_count = 0 THEN 'EXISTS BUT EMPTY'
      ELSE lab_count::text || ' records exist' 
    END;
  
  RAISE NOTICE 'Challenges table: % records', 
    CASE 
      WHEN challenge_count = -1 THEN 'TABLE DOES NOT EXIST' 
      WHEN challenge_count = 0 THEN 'EXISTS BUT EMPTY'
      ELSE challenge_count::text || ' records exist' 
    END;
  
  RAISE NOTICE 'New_operation table: % records', 
    CASE 
      WHEN operation_count = -1 THEN 'TABLE DOES NOT EXIST' 
      WHEN operation_count = 0 THEN 'EXISTS BUT EMPTY'
      ELSE operation_count::text || ' records exist' 
    END;
  
  RAISE NOTICE '';
  RAISE NOTICE 'BACKUP STATUS:';
  RAISE NOTICE '-------------------';
  RAISE NOTICE 'labs_backup table: %', 
    CASE 
      WHEN NOT has_lab_backup THEN 'DOES NOT EXIST' 
      WHEN backup_lab_count = 0 THEN 'EXISTS BUT EMPTY'
      ELSE 'EXISTS with ' || backup_lab_count::text || ' records'
    END;
  
  RAISE NOTICE 'challenges_backup table: %', 
    CASE 
      WHEN NOT has_challenge_backup THEN 'DOES NOT EXIST' 
      WHEN backup_challenge_count = 0 THEN 'EXISTS BUT EMPTY'
      ELSE 'EXISTS with ' || backup_challenge_count::text || ' records'
    END;
  
  RAISE NOTICE 'New_operation_backup table: %', 
    CASE 
      WHEN NOT has_operation_backup THEN 'DOES NOT EXIST' 
      WHEN backup_operation_count = 0 THEN 'EXISTS BUT EMPTY'
      ELSE 'EXISTS with ' || backup_operation_count::text || ' records'
    END;
  
  RAISE NOTICE '';
  RAISE NOTICE 'RECOVERY ASSESSMENT:';
  RAISE NOTICE '-------------------';
  
  -- Labs recovery assessment
  IF lab_count = -1 THEN
    RAISE NOTICE 'Labs table needs to be created first';
  ELSIF lab_count = 0 THEN
    IF has_lab_backup AND backup_lab_count > 0 THEN
      RAISE NOTICE 'Labs table can be restored from backup (% records available)', backup_lab_count;
    ELSE
      RAISE NOTICE 'Labs table is empty with no viable backup';
    END IF;
  ELSE
    RAISE NOTICE 'Labs table has data (% records) - no recovery needed', lab_count;
  END IF;
  
  -- Challenges recovery assessment
  IF challenge_count = -1 THEN
    RAISE NOTICE 'Challenges table needs to be created first';
  ELSIF challenge_count = 0 THEN
    IF has_challenge_backup AND backup_challenge_count > 0 THEN
      RAISE NOTICE 'Challenges table can be restored from backup (% records available)', backup_challenge_count;
    ELSE
      RAISE NOTICE 'Challenges table is empty with no viable backup';
    END IF;
  ELSE
    RAISE NOTICE 'Challenges table has data (% records) - no recovery needed', challenge_count;
  END IF;
  
  -- Operations recovery assessment
  IF operation_count = -1 THEN
    RAISE NOTICE 'New_operation table needs to be created first';
  ELSIF operation_count = 0 THEN
    IF has_operation_backup AND backup_operation_count > 0 THEN
      RAISE NOTICE 'New_operation table can be restored from backup (% records available)', backup_operation_count;
    ELSE
      RAISE NOTICE 'New_operation table is empty with no viable backup';
    END IF;
  ELSE
    RAISE NOTICE 'New_operation table has data (% records) - no recovery needed', operation_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'NO CHANGES HAVE BEEN MADE - This was only a diagnostic check';
  RAISE NOTICE 'To perform actual recovery, you will need to run a separate script';
END $$;
