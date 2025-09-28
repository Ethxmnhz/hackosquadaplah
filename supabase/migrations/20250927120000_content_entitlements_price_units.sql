-- Migration: clarify individual_price units (rupees) for content_entitlements
-- If earlier data stored paise, normalize by heuristic: large values (>10000) divided by 100.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='content_entitlements' AND column_name='individual_price'
  ) THEN
    -- Heuristic normalization: treat values >= 10000 as paise (>= ₹100) and convert to rupees.
    UPDATE public.content_entitlements
      SET individual_price = individual_price / 100
      WHERE individual_price IS NOT NULL AND individual_price >= 10000;

    COMMENT ON COLUMN public.content_entitlements.individual_price IS 'Whole rupees (integer). Edge functions convert to paise when creating Razorpay orders.';
  END IF;
END $$;

COMMENT ON TABLE public.content_entitlements IS 'Defines gating (required plan) and optional individual price (whole rupees) for specific content items.';
