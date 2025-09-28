# Payment / Subscription Implementation (Concise Summary)

This file is a condensed companion to `PAYMENT_IMPLEMENTATION.md` summarizing what was built for the plan upgrade + payment flow.

---
## Core Goal
Enable authenticated users to upgrade from the implicit `free` plan to either `hifi` or `sify` using Razorpay Checkout, storing only their current plan (no recurring billing yet).

---
## Components
- Edge Function: `pay-plan` (actions: `diag`, `create`, `verify`)
- Table: `user_plans (user_id, plan, activated_at, updated_at)`
- Frontend: Billing page UI (`src/pages/billing/index.tsx`)
- Helper: `payPlan()` + `getUserPlan()` in `src/lib/api.ts`
- Auth: Supabase (JWT `sub` used as `user_id`)

---
## Flow (Real Payment)
1. Click Upgrade → frontend calls `payPlan('create', { plan })`.
2. Edge function validates + creates Razorpay order (or errors).
3. Frontend opens Razorpay checkout with returned `{ order_id, key, amount }`.
4. On success: Razorpay passes `payment_id` + `signature` → call `payPlan('verify', ...)`.
5. Function recomputes HMAC → upserts `user_plans` row → returns success.
6. UI refreshes current plan.

Mock Mode (optional): Set `RAZORPAY_MOCK_MODE=1`; function returns synthetic order; frontend immediately calls verify with mock IDs.

---
## Environment Variables
| Name | Purpose |
| ---- | ------- |
| `RAZORPAY_KEY_ID` | Publishable key (test or live). |
| `RAZORPAY_KEY_SECRET` (or fallback names) | Server secret for order + HMAC. |
| `PLAN_HIFI_AMOUNT` / `PLAN_SIFY_AMOUNT` | Price in paise (default 100 = ₹1). |
| `RAZORPAY_MOCK_MODE` | If `1`, bypass real Razorpay. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Edge function DB upsert. |

Fallback secret names accepted: `RAZORPAY_SECRET`, `RAZORPAY_SECRET_KEY`, `RAZORPAY_KEY`.

---
## Edge Function Actions
Action | Input | Output (success) | Notes
------ | ----- | ---------------- | -----
`diag` | `{ action:"diag" }` | Key + pricing status | No secrets leaked.
`create` | `{ action:"create", plan }` | Order info `{ order_id, amount, key }` | Rejects if already on plan.
`verify` | `{ action:"verify", plan, order_id, razorpay_payment_id, razorpay_signature }` | `{ success: true }` | HMAC check, then upsert.

Supported plans: `hifi`, `sify` (anything else rejected). `free` is implicit (row may not exist).

---
## Error Codes
Code | Meaning | Typical Fix
---- | ------- | -----------
`ALREADY_ON_PLAN` | Same plan chosen | Ignore / hide button.
`MISSING_KEYS` | Missing key/secret | Set secrets & redeploy.
`LOW_AMOUNT` | Below Razorpay minimum | Increase plan amount.
`RAZORPAY_STATUS_<n>` | Order API non-200 | Check credentials / amount.
`RAZORPAY_NETWORK` | Network failure | Retry; check connectivity.
`PLAN_STORE_FAILED` | DB upsert error | Verify service key + RLS.
`UNHANDLED` | Unexpected error | Inspect logs.

Frontend also listens for `payment.failed` from Razorpay and surfaces description.

---
## Security Snapshot
- Secrets only in edge runtime (never in client bundle).
- HMAC (SHA-256) validation using secret.
- RLS ensures users can only see/change their own plan.
- CORS currently `*` (tighten later to production domain).
- Minimal JWT decode (future: full signature verification inline).

---
## Known Limitations
- No recurring subscription management (pure one-time upgrade).
- No webhooks (cannot recover from late failures / refunds automatically).
- No downgrade / cancellation path.
- No order/payment audit table.
- No rate limiting.

---
## Fast Diagnostics
Run:
```json
{"action":"diag"}
```
If `has_key_secret` = `false` → set proper secret variable and redeploy.

---
## Quick Deploy (CLI Example)
```
supabase secrets set RAZORPAY_KEY_ID=rzp_test_XXXX RAZORPAY_KEY_SECRET=YYYY PLAN_HIFI_AMOUNT=100 PLAN_SIFY_AMOUNT=100
supabase functions deploy pay-plan
```

---
## Next Suggested Enhancements
1. Webhook for payment verification + reconciliation.
2. Domain-restricted CORS.
3. Downgrade & plan audit history.
4. Price versioning & integrity checks.
5. Rate limiting + anti-abuse counters.
6. Full JWT verification & improved logging redaction.

---
## Minimal Checklist (Present State)
- [x] Order creation
- [x] Signature verification
- [x] Plan upsert / update
- [x] Mock mode
- [x] Error taxonomy
- [x] Diagnostic endpoint
- [ ] Webhooks
- [ ] Downgrade / cancellation
- [ ] Recurring billing

---
If anything here diverges from reality, update this file together with `PAYMENT_IMPLEMENTATION.md`.
