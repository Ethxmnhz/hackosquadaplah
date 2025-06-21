/*
  # Fix Operations Foreign Keys to Reference Profiles

  1. Changes
    - Update foreign key constraints in operations tables to reference profiles(id) instead of auth.users(id)
    - This allows proper joins between operations tables and profiles for username display

  2. Tables Modified
    - operation_requests
    - active_operations
    - operation_events
    - operation_chat
*/

-- First drop existing foreign key constraints
ALTER TABLE IF EXISTS operation_requests 
  DROP CONSTRAINT IF EXISTS operation_requests_red_team_user_fkey,
  DROP CONSTRAINT IF EXISTS operation_requests_blue_team_user_fkey;

ALTER TABLE IF EXISTS active_operations
  DROP CONSTRAINT IF EXISTS active_operations_red_team_user_fkey,
  DROP CONSTRAINT IF EXISTS active_operations_blue_team_user_fkey;

ALTER TABLE IF EXISTS operation_events
  DROP CONSTRAINT IF EXISTS operation_events_user_id_fkey;

ALTER TABLE IF EXISTS operation_chat
  DROP CONSTRAINT IF EXISTS operation_chat_user_id_fkey;

-- Now recreate the constraints to reference profiles
ALTER TABLE IF EXISTS operation_requests
  ADD CONSTRAINT operation_requests_red_team_user_fkey
    FOREIGN KEY (red_team_user) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT operation_requests_blue_team_user_fkey
    FOREIGN KEY (blue_team_user) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS active_operations
  ADD CONSTRAINT active_operations_red_team_user_fkey
    FOREIGN KEY (red_team_user) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT active_operations_blue_team_user_fkey
    FOREIGN KEY (blue_team_user) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS operation_events
  ADD CONSTRAINT operation_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS operation_chat
  ADD CONSTRAINT operation_chat_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;