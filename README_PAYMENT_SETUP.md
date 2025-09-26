# Simple Plan Payment (Razorpay) Setup

This repository now includes a minimal Razorpay flow to upgrade a user from `free` to `hifi` or `sify`.

## Components Added
- Migration: `20250926170000_add_user_plans.sql` -> table `user_plans` with RLS.
- Edge Function: `supabase/functions/pay-plan/index.ts` -> creates & verifies Razorpay orders.
- Frontend:
  - Helpers in `src/lib/api.ts` -> `getUserPlan`, `payPlan`.
  - Updated `src/pages/billing/index.tsx` with dynamic payment UI.

## Database Migration
Run (from your project root):
```
supabase migration up
```
Ensure table `user_plans` exists and policies are applied.

## Required Secrets (Supabase Project)
Set these in your Supabase dashboard (Project Settings > API / Config) or via CLI:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` (already present; don't expose publicly)

The edge runtime automatically has `SUPABASE_URL`.

## Deploy Edge Function
```
supabase functions deploy pay-plan --no-verify-jwt
```
You can keep JWT verification disabled if calling with anon key + client token; we manually decode the user. For stricter security you can enable verification and remove the manual decode.

## Frontend Flow
1. User visits Billing page.
2. Page fetches current plan via `getUserPlan()`.
3. User clicks Upgrade on HiFi or Sify.
4. Frontend calls edge function (action=create) -> returns Razorpay order.
5. Razorpay Checkout opens; on success handler calls edge function (action=verify) with signature.
6. Edge function validates HMAC and upserts `user_plans` row.
7. UI updates to show new plan.

## Pricing
Currently both `hifi` and `sify` are hardcoded to ₹1 (100 paise) for test. Adjust in `supabase/functions/pay-plan/index.ts` `priceMap`.

## Notes / Next Steps
- Add webhook for payment status fallback (optional for retries).
- Filter premium content by checking `user_plans.plan` in queries.
- Consider adding expiry or subscription cycle fields later.
- Add server-side verification for plan-based content gating.

## Troubleshooting
- If Razorpay modal does not open, check console for `Razorpay SDK not loaded` (script may be blocked).
- If signature mismatch: ensure keys are correct and no whitespace in env values.
- Use network tab to inspect calls to `/functions/v1/pay-plan`.

## Security Considerations
- Do not trust plan from client; always read from DB for gating.
- Service role key is only used inside edge function; never expose in frontend.
- Current implementation does minimal JWT parsing; enabling verify-jwt in deployment strengthens security.
