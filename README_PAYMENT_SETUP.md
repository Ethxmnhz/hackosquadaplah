# Simple Plan Payment (Razorpay) Setup

This repository now includes a minimal Razorpay flow to upgrade a user from `free` to `hifi` or `sify`.

## Components Added
- Migration: `20250926170000_add_user_plans.sql` -> table `user_plans` with RLS.
- Edge Function: `supabase/functions/pay-plan/index.ts` -> creates & verifies Razorpay orders.
- Frontend:
  - Helpers in `src/lib/api.ts` -> `getUserPlan`, `payPlan`.
  - Updated `src/pages/billing/index.tsx` with dynamic payment UI.
 - (Extended) Content gating + one-off purchase:
   - Migration: `can_access_content` function + `content_entitlements`, `user_content_purchases` tables.
   - Edge Function: `purchase-content` for item purchase (create / verify).
   - Hook: `useContentAccess` + `<Gate>` component for conditional rendering.

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
supabase functions deploy purchase-content --no-verify-jwt
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

### Individual Item Purchase Flow (Certification / Challenge etc.)
1. UI calls `useContentAccess` -> sees `allow=false`, reason `UPGRADE_OR_BUY`, maybe `required_plan` & `individual_price`.
2. User clicks Buy -> POST `/functions/v1/purchase-content` `{ action:'create', content_type, content_id }`.
3. Receive Razorpay order (or mock) -> launch Razorpay Checkout (integration step TBD).
4. On success: POST `/functions/v1/purchase-content` `{ action:'verify', order_id, razorpay_payment_id, razorpay_signature }`.
5. Edge function validates signature & inserts `user_content_purchases` row.
6. UI refetches access -> `allow=true` (reason `PURCHASE_OK`).

### Real (Non-Mock) Payments Configuration
Ensure mock mode is disabled (either unset or set `RAZORPAY_MOCK_MODE` to `0`). Required environment variables in the Supabase project (Edge Functions config):

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET` (or `RAZORPAY_SECRET` / `RAZORPAY_KEY`; first present wins)
- (Optional) `RAZORPAY_MOCK_MODE=0`

For one-off content purchases the edge function now records the actual price paid (whole rupees) by embedding `amount_units` in the Razorpay order notes and persisting it to `user_content_purchases.price_paid` on successful verification.

If you change prices in `content_entitlements`, existing purchases remain with their historical `price_paid` for audit.

## Pricing
Currently both `hifi` and `sify` are hardcoded to ₹1 (100 paise) for test. Adjust in `supabase/functions/pay-plan/index.ts` `priceMap`.

## Notes / Next Steps
- Add webhook for payment status fallback (optional for retries).
- Filter premium content by checking `user_plans.plan` in queries.
- Consider adding expiry or subscription cycle fields later.
- Add server-side verification for plan-based content gating.
- Integrate actual Razorpay Checkout script for both plan and item purchase flows.
- Provide dedicated Pricing page consolidating upgrade + per-item purchase CTAs.

## Troubleshooting
- If Razorpay modal does not open, check console for `Razorpay SDK not loaded` (script may be blocked).
- If signature mismatch: ensure keys are correct and no whitespace in env values.
- Use network tab to inspect calls to `/functions/v1/pay-plan`.

## Security Considerations
- Do not trust plan from client; always read from DB for gating.
- Service role key is only used inside edge function; never expose in frontend.
- Current implementation does minimal JWT parsing; enabling verify-jwt in deployment strengthens security.
