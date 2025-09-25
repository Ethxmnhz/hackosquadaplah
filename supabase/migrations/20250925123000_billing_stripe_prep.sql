-- Billing Stripe Prep Migration
-- Adds external_event_id for idempotency and processing status indexes

ALTER TABLE public.provider_events ADD COLUMN IF NOT EXISTS external_event_id text;
CREATE INDEX IF NOT EXISTS provider_events_external_event_idx ON public.provider_events(provider, external_event_id) WHERE external_event_id IS NOT NULL;

-- Unique constraint to prevent duplicate processing of same provider event id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='provider_events_provider_external_unique') THEN
    EXECUTE 'CREATE UNIQUE INDEX provider_events_provider_external_unique ON public.provider_events(provider, external_event_id) WHERE external_event_id IS NOT NULL';
  END IF;
END $$;
