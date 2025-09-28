# Payment & Plan Upgrade Implementation

This document captures the current lightweight Razorpay-based subscription upgrade system implemented in this repository.

> Scope: Minimal upgrade (Free -> HiFi / Sify) with client checkout + post‑verification storing plan in `user_plans` table. No recurring billing, webhooks, proration, or invoicing yet.

---
## Table of Contents
1. High-Level Architecture
2. Data Model (user_plans)
3. Environment Variables
4. Edge Function Overview
5. Frontend Integration
6. Error & Code Taxonomy
7. Deployment & Diagnostics
8. Security Considerations
9. Troubleshooting Guide
10. Future Extensions (Backlog)
11. Quick Reference (Cheat Sheet)
12. Change Log (Summary)
13. Acceptance / Current State

---
## 1. High-Level Architecture

Component | Responsibility
--------- | --------------
Razorpay Checkout (browser) | Collects & processes payment for an order created by the edge function.
Supabase Edge Function `pay-plan` | Secure backend for: diagnostics, order creation, signature verification, plan persistence.
Postgres table `user_plans` | Stores the user's current plan and activation timestamp.
React Billing Page | Renders plans, triggers payment flow, handles success/failure UI.
Supabase Auth | Provides authenticated user identity (JWT `sub` used as `user_id`).

Flow (successful real payment):
1. User clicks upgrade (HiFi or Sify) in Billing UI.
2. Frontend calls edge function (`action: create, plan: hifi|sify`).
3. Edge function validates auth, pricing, and attempts Razorpay order creation.
4. Response returns `order_id`, `amount`, `key` (publishable ID).
5. Frontend initializes Razorpay Checkout with returned order.
6. User completes payment → Razorpay calls `handler` callback with `razorpay_payment_id` & `razorpay_signature`.
7. Frontend calls edge function (`action: verify`) passing order/payment/signature.
8. Edge function recomputes HMAC; on success upserts row in `user_plans` with new plan.
9. UI updates to show upgraded plan.

Mock mode (explicit only): If env `RAZORPAY_MOCK_MODE=1`, the function returns synthetic order + auto-valid signature bypass.

---
## 2. Data Model (`user_plans`)

Field | Purpose
----- | -------
`user_id` (uuid, PK / unique) | Supabase Auth user UUID.
`plan` (text enum-like) | `free` (implicit), `hifi`, or `sify`.
`activated_at` (timestamptz) | Time of upgrade (set/updated on successful verify).
`updated_at` trigger | Maintains row freshness.

RLS ensures only the authenticated user (or service role) can read/update their own record.

Free users may have no row; frontend treats missing record as `free`.

---
## 3. Environment Variables

Variable | Required | Description
-------- | -------- | -----------
`RAZORPAY_KEY_ID` | Yes (real mode) | Razorpay publishable key (starts with `rzp_test_` or `rzp_live_`).
`RAZORPAY_KEY_SECRET` | Yes (real mode) | Razorpay secret key (server-side only). Fallback variable names are also checked.
`RAZORPAY_SECRET` / `RAZORPAY_SECRET_KEY` / `RAZORPAY_KEY` | Fallback | Alternate secret names accepted (first non-empty wins).
`RAZORPAY_MOCK_MODE` | Optional | `1` enables mock order + signature bypass.
`PLAN_HIFI_AMOUNT` | Optional | HiFi price in paise (default `100` = ₹1.00). Ensure it satisfies Razorpay minimum (often ≥100).
`PLAN_SIFY_AMOUNT` | Optional | Sify price in paise (default `100` = ₹1.00). Ensure it satisfies Razorpay minimum.
`SUPABASE_URL` | Yes | Service REST endpoint (edge runtime injection).
`SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key used for secure row upsert.

In diagnostics (`action: diag`) we expose only booleans and a short prefix of `RAZORPAY_KEY_ID` for safety.

---
## 4. Edge Function: `supabase/functions/pay-plan/index.ts`

Actions:
- `diag`: Returns status of key presence, mock mode, pricing numbers.
- `create`: Creates (or mocks) a Razorpay order for plan upgrade. Rejects if already on the target plan.
- `verify`: Verifies Razorpay signature then stores/upserts plan record.

Key Behaviors:
- CORS enabled for `POST` + `OPTIONS` with wildcard origin (tighten later).
- Minimal JWT decode (assumes Supabase already validated) extracts `sub`.
- Duplicate upgrade guard: throws `ALREADY_ON_PLAN` early.
- Pricing read dynamically per action from env; low amounts may trigger Razorpay 400 (classified).
- Uses Basic Auth with Razorpay REST API for order creation.
- HMAC signature: SHA-256 over `order_id|payment_id` using secret.
- Mock mode bypasses real order + HMAC.

Returned JSON (selected):
- `create`: `{ order_id, amount, currency, key, mock?, mock_mode }`
- `verify`: `{ success: true, mock_mode }`
- `diag`: `{ ok: true, mock_mode, has_key_id, has_key_secret, key_id_prefix, pricing }`

---
## 5. Frontend Integration (`src/pages/billing/index.tsx`)

1. Renders three plans (Free, HiFi, Sify) with minimal feature lists.
2. Calls `payPlan('create', { plan })` on upgrade button.
3. If response indicates mock, immediately calls `verify` with synthetic IDs.
4. Otherwise loads Razorpay SDK (once) and opens checkout with the order.
5. Success handler calls `verify` to persist plan.
6. `payment.failed` event listener surfaces descriptive Razorpay errors.
7. Local UI state tracks `loading`, `error`, `success`, and target `payingPlan`.

Helper (`src/lib/api.ts`):
- `payPlan(action, payload)` wraps Supabase `functions.invoke` and logs detailed errors.
- `getUserPlan()` returns `{ plan: 'free' }` fallback if row absent or 406-like condition.

---
## 6. Error & Code Taxonomy

Code | Meaning | Typical Cause | HTTP Status (edge response)
---- | ------- | ------------- | ---------------------------
`ALREADY_ON_PLAN` | User requested same plan | Guard in `createOrder` | 400
`MISSING_KEYS` | Razorpay secret or id absent | Env not set or misnamed | 500
`LOW_AMOUNT` | Amount below Razorpay minimum (paise) | Test price too small | 400
`RAZORPAY_STATUS_<code>` | Non-OK from Razorpay order API | Auth failure, config mismatch, invalid amount | 502 (except 400 low amount mapped)
`RAZORPAY_NETWORK` | Network error to Razorpay | Connectivity/DNS | 503
`PLAN_STORE_FAILED` | Upsert failed | DB / RLS / service key issue | 500
`UNHANDLED` | Catch-all outer error | Unexpected runtime issue | 500

Client also surfaces Razorpay Checkout `payment.failed` errors (e.g., card decline) as plain text.

---
## 7. Deployment & Diagnostics

Deploy (example PowerShell, using Supabase CLI if available):
```powershell
# Set secrets (example test mode)
supabase secrets set RAZORPAY_KEY_ID=rzp_test_XXXX RAZORPAY_KEY_SECRET=YYYY PLAN_HIFI_AMOUNT=100 PLAN_SIFY_AMOUNT=100

# Deploy the function
supabase functions deploy pay-plan
```

Diagnostic call (PowerShell using session access token environment variable `$env:SB_TOKEN`):
```powershell
$resp = curl -s -X POST `
  -H "Authorization: Bearer $env:SB_TOKEN" `
  -H "Content-Type: application/json" `
  https://<PROJECT_REF>.functions.supabase.co/pay-plan `
  -d '{"action":"diag"}'
$resp | Write-Host
```
Expected success diagnostic:
```json
{
  "ok": true,
  "mock_mode": false,
  "has_key_id": true,
  "has_key_secret": true,
  "key_id_prefix": "rzp_test",
  "pricing": { "hifi": 100, "sify": 100 }
}
```

If `has_key_secret` is false the function will refuse real `create` calls (unless mock mode enabled).

---
## 8. Security Considerations

Current Safeguards:
- Secrets never exposed to client (only `key_id` shared for checkout).
- HMAC verification performed before plan persistence.
- Service role key confined to edge runtime (not bundled client-side).
- RLS on `user_plans` restricts manipulation to owner or service role.
- Only supported plans (`hifi`, `sify`) accepted; unrecognized plan rejected.

Gaps / Future Hardening:
- Full JWT signature verification inside function (not just decode).
- Enforce domain allow‑list for CORS instead of `*`.
- Add rate limiting (e.g., per-IP or per-user) to curb abuse.
- Add webhook reconciliation for authoritative payment status (handles late failures/refunds).
- Store Razorpay order + payment IDs in table for audit.
- Add downgrade / cancellation semantics.
- Add idempotency keys for repeated verify calls.
- Validate price amount server-side against canonical price versioning (prevent mismatch / tampering attempts).

---
## 9. Troubleshooting Guide

Symptom | Likely Cause | Fix
------- | ------------ | ---
`has_key_secret: false` in diag | Secret missing or misnamed | Set `RAZORPAY_KEY_SECRET` and redeploy.
`code: MISSING_KEYS` on create | Same as above | Provide both key ID & secret.
`code: LOW_AMOUNT` | Price below allowed minimum | Increase `PLAN_*_AMOUNT` (e.g., 100 = ₹1; maybe raise to ≥100). Check Razorpay docs for current minimum.
`RAZORPAY_STATUS_401/403` | Wrong key pair or using test key in live checkout | Ensure keys correspond to environment; for test use test checkout only.
Checkout opens but payment fails immediately | Signature mismatch / wrong secret | Verify secret value & no trailing spaces.
`PLAN_STORE_FAILED` | RLS denied / service key not set | Confirm `SUPABASE_SERVICE_ROLE_KEY` present and table policies correct.
UI stuck on Processing... | Exception before modal, network fail | Check console `[payPlan] invoke error` logs.

---
## 10. Future Extensions (Backlog)
- Webhooks: `/v1/payments/:id` polling removal in favor of webhook reliability.
- Subscription cycles & renewal / proration logic.
- Coupon / voucher integration referencing future `vouchers` table.
- Multi-currency support (pricing map & currency env var).
- Analytics events (upgrade funnel metrics).
- Admin dashboard for plan distribution & revenue metrics.

---
## 11. Quick Reference (Cheat Sheet)

Action | Request Body | Response (success)
------ | ------------ | ------------------
Diag | `{ "action":"diag" }` | Status object
Create | `{ "action":"create", "plan":"hifi" }` | `{ order_id, amount, currency, key }`
Verify | `{ "action":"verify", "plan":"hifi", "order_id":"...", "razorpay_payment_id":"...", "razorpay_signature":"..." }` | `{ success: true }`

---
## 12. Change Log (Summary)
- Removed legacy multi-provider billing system & artifacts.
- Added `user_plans` table with RLS + timestamp triggers.
- Implemented `pay-plan` edge function (diag/create/verify).
- Added dynamic pricing env vars & error classification taxonomy.
- Added duplicate plan guard & improved logging.
- Frontend billing page with Razorpay checkout integration & mock support.
- Unified Supabase client to avoid auth fragmentation.
- Added payment failure listener & robust console diagnostics.
- Introduced secret fallback env name resolution.

---
## 13. Acceptance / Current State
- Real payment success depends on both Razorpay credentials set (diag must show `has_key_secret: true`).
- Mock mode functional for development if explicitly enabled.
- Plan persistence verified through `user_plans` upsert & subsequent fetch.

> This document should be updated as soon as: webhooks are added, pricing changes, or subscription lifecycle features expand beyond one-time upgrade.

---
**End of Document**
