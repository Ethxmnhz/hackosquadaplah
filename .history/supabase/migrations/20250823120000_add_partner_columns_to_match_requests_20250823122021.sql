-- Migration: Add partner_id and partner_username to match_requests
ALTER TABLE match_requests
  ADD COLUMN partner_id uuid NULL,
  ADD COLUMN partner_username text NULL;
