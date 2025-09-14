-- Migration: Add session_id to match_requests for robust session-based matchmaking
ALTER TABLE match_requests
  ADD COLUMN session_id uuid NULL;
