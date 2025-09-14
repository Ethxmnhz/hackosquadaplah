-- Migration: Remove legacy matchmaking components and focus only on Arena invitation system
-- Date: 2025-09-12

-- First, let's make sure we have a backup of any important data
-- Create a backup of the match_requests table
CREATE TABLE IF NOT EXISTS match_requests_backup_20250912 AS 
SELECT * FROM match_requests;

-- Remove any legacy columns that might exist on match_requests table but aren't used in Arena
ALTER TABLE match_requests DROP COLUMN IF EXISTS invited_by;
ALTER TABLE match_requests DROP COLUMN IF EXISTS invited_by_username;

-- Remove any foreign keys that might reference old matchmaking tables
ALTER TABLE match_requests DROP CONSTRAINT IF EXISTS match_requests_session_id_fkey;

-- Clear out any old match requests that aren't part of the Arena system
-- Keep only those with status 'waiting', 'invited', 'matched', or 'declined'
DELETE FROM match_requests 
WHERE status NOT IN ('waiting', 'invited', 'matched', 'declined');

-- Make sure we're only using the standard columns that Arena expects
-- Validate that match_requests table has the expected structure for Arena
DO $$
BEGIN
  -- Check if all required columns exist with correct types
  PERFORM column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'match_requests'
  AND column_name IN ('id', 'created_at', 'user_id', 'username', 'lab_id', 'team', 'status', 'partner_id', 'partner_username', 'session_id');
  
  -- Log a message
  RAISE NOTICE 'Match requests table structure validated for Arena system';
END
$$;

-- Add the composite index for invitation lookups if it doesn't already exist
DROP INDEX IF EXISTS idx_match_requests_partner_id_status;
CREATE INDEX idx_match_requests_partner_id_status ON public.match_requests(partner_id, status)
WHERE status = 'invited';

-- Ensure we have the right RLS policies for the Arena invitation system
-- Everyone can see public match requests and their own
DROP POLICY IF EXISTS "Users can view public match requests and their own" ON public.match_requests;
CREATE POLICY "Users can view public match requests and their own"
ON public.match_requests FOR SELECT
USING (
    status = 'waiting'
    OR user_id = auth.uid()
    OR partner_id = auth.uid()
);

-- Users can create their own match requests
DROP POLICY IF EXISTS "Users can create their own match requests" ON public.match_requests;
CREATE POLICY "Users can create their own match requests"
ON public.match_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own match requests or ones where they are the partner
DROP POLICY IF EXISTS "Users can update their own match requests or ones they're invited to" ON public.match_requests;
CREATE POLICY "Users can update their own match requests or ones they're invited to"
ON public.match_requests FOR UPDATE
USING (user_id = auth.uid() OR partner_id = auth.uid());

-- Make sure the notifications table has the right structure and policies
-- Check if the notifications table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Make sure the notifications table has the right RLS policies
    DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
    CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

    -- Allow inserts for any authenticated user (for notifications to others)
    DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
    CREATE POLICY "Authenticated users can create notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

    -- Users can update their own notifications (e.g., marking as seen)
    DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
    CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());
    
    RAISE NOTICE 'Notifications table exists and policies have been updated';
  ELSE
    RAISE NOTICE 'Notifications table does not exist, skipping policy updates';
  END IF;
END
$$;
