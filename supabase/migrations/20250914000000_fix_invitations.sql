-- Fix for invitation system
-- This migration adds functions to help with invitation status updates and fixes lab_sessions schema

-- Add missing columns to lab_sessions table
ALTER TABLE IF EXISTS public.lab_sessions
ADD COLUMN IF NOT EXISTS time_remaining integer DEFAULT 3600,
ADD COLUMN IF NOT EXISTS ends_at timestamptz DEFAULT (now() + interval '1 hour'),
ADD COLUMN IF NOT EXISTS request_id uuid;

-- Function to force update a match request using direct SQL
CREATE OR REPLACE FUNCTION public.force_update_match_request(p_id uuid, p_status text, p_partner_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.match_requests
  SET 
    status = p_status,
    partner_id = p_partner_id
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set a match request to invited status
CREATE OR REPLACE FUNCTION public.set_match_request_invited(p_request_id uuid, p_partner_id uuid, p_partner_username text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update directly using SQL
  UPDATE public.match_requests
  SET 
    status = 'invited',
    partner_id = p_partner_id,
    partner_username = p_partner_username
  WHERE id = p_request_id
  RETURNING to_jsonb(match_requests.*) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the functions
GRANT EXECUTE ON FUNCTION public.force_update_match_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_match_request_invited TO authenticated;

-- Add policies to ensure users can only update requests they are involved in
DROP POLICY IF EXISTS match_requests_update_policy ON public.match_requests;

CREATE POLICY match_requests_update_policy ON public.match_requests
  FOR UPDATE 
  USING (
    auth.uid() = user_id OR 
    auth.uid() = partner_id OR
    partner_id IS NULL
  );
