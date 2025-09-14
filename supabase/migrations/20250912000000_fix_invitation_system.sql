-- Create the match_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.match_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    lab_id UUID NOT NULL,
    team TEXT CHECK (team IN ('Red', 'Blue')),
    status TEXT CHECK (status IN ('waiting', 'invited', 'matched', 'declined')),
    partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    partner_username TEXT,
    session_id UUID
);

-- Reindex the match_requests table to ensure proper indexing of columns
DROP INDEX IF EXISTS idx_match_requests_user_id;
DROP INDEX IF EXISTS idx_match_requests_partner_id;
DROP INDEX IF EXISTS idx_match_requests_status;
DROP INDEX IF EXISTS idx_match_requests_id_status;
DROP INDEX IF EXISTS idx_match_requests_partner_id_status;

-- Individual column indexes
CREATE INDEX idx_match_requests_user_id ON public.match_requests(user_id);
CREATE INDEX idx_match_requests_partner_id ON public.match_requests(partner_id);
CREATE INDEX idx_match_requests_status ON public.match_requests(status);

-- Composite indexes for common query patterns
CREATE UNIQUE INDEX idx_match_requests_id_status ON public.match_requests(id, status)
WHERE status = 'waiting';

-- Specialized index for finding invitations to a specific user
CREATE INDEX idx_match_requests_partner_id_status ON public.match_requests(partner_id, status)
WHERE status = 'invited';

-- Add RLS policies for match_requests
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;

-- Everyone can see public match requests and their own
-- First drop the policy if it exists
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

-- Create the notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT,
    message TEXT,
    seen BOOLEAN DEFAULT FALSE,
    session_id UUID
);

-- Add RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
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
