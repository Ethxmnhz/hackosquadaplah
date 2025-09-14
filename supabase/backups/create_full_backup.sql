-- Script to create a full database backup
-- This should be run BEFORE applying any potentially dangerous migrations

-- Create backup tables for all important data tables
CREATE TABLE IF NOT EXISTS labs_backup AS SELECT * FROM labs;
CREATE TABLE IF NOT EXISTS challenges_backup AS SELECT * FROM challenges;
CREATE TABLE IF NOT EXISTS New_operation_backup AS SELECT * FROM New_operation;
CREATE TABLE IF NOT EXISTS match_requests_backup AS SELECT * FROM match_requests;
CREATE TABLE IF NOT EXISTS lab_sessions_backup AS SELECT * FROM lab_sessions;
CREATE TABLE IF NOT EXISTS profiles_backup AS SELECT * FROM profiles;
CREATE TABLE IF NOT EXISTS admin_users_backup AS SELECT * FROM admin_users;

-- Create a timestamp record of when the backup was made
CREATE TABLE IF NOT EXISTS backup_log (
  id SERIAL PRIMARY KEY,
  backup_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  backup_user TEXT,
  notes TEXT
);

-- Log this backup
INSERT INTO backup_log (backup_user, notes) 
VALUES (current_user, 'Full database backup before admin permissions change');

-- Output the counts of backed up data
DO $$
DECLARE
  lab_count INTEGER;
  challenge_count INTEGER;
  operation_count INTEGER;
  request_count INTEGER;
  session_count INTEGER;
  profile_count INTEGER;
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO lab_count FROM labs_backup;
  SELECT COUNT(*) INTO challenge_count FROM challenges_backup;
  SELECT COUNT(*) INTO operation_count FROM New_operation_backup;
  SELECT COUNT(*) INTO request_count FROM match_requests_backup;
  SELECT COUNT(*) INTO session_count FROM lab_sessions_backup;
  SELECT COUNT(*) INTO profile_count FROM profiles_backup;
  SELECT COUNT(*) INTO admin_count FROM admin_users_backup;
  
  RAISE NOTICE 'Backup complete: % labs, % challenges, % operations, % requests, % sessions, % profiles, % admins',
    lab_count, challenge_count, operation_count, request_count, session_count, profile_count, admin_count;
END $$;
