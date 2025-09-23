# Payments & Subscriptions: Technical Execution Plan

This document details exactly what we’ll build, why, and how—so we can sell monthly plans, one‑time vouchers (certifications, ops, season passes), support free content, and swap payment gateways without touching app logic.

## 1) Objectives
- Offer 2–3 monthly plans (Basic/Pro/Elite) across regions and currencies.
- Keep some challenges/operations/certifications free.
- Gate premium content and operations by plan or one‑time purchases (vouchers, ops, season passes).
- Sell certification vouchers separately; also include certs inside plans.
- Support multiple gateways (Stripe, Razorpay, PayPal). Switching should not require UI rewrites.
- Run a separate, internal Billing Admin panel for catalog, vouchers, pricing, and auditing.

## 2) Core Principle: Entitlements, Not Providers
The UI and domain logic will only ask “does the user have entitlement X?” and never check a payment provider directly. Provider complexity stays behind a small adapter layer and in the backend.

- Content tagging (access_tier):
  - free | premium | challenge_pack:<slug> | cert:<code> | op:<slug> | season:<slug>
- Entitlements (scopes the UI checks):
  - app, challenges:all, challenge_pack:<slug>, cert:<code>, cert:*, redvsblue:ops:*, redvsblue:op:<slug>, redvsblue:season:<slug>, redvsblue:unlimited

If the user has the required scope, unlock; otherwise show a Paywall (upgrade, buy, redeem voucher).

## 3) Data Model (Postgres/Supabase)
- products (what we sell)
  - id, slug, type ('plan'|'voucher'|'addon'), name, description, features jsonb, created_at
- prices (how we sell it)
  - id, product_id, billing_cycle ('one_time'|'monthly'|'yearly'), currency, unit_amount, region ('*'|'IN'|'EU'|'US'...), provider ('stripe'|'razorpay'|'paypal'), provider_price_id, is_active
- purchases (one‑time orders)
  - id, user_id, product_id, price_id, provider, provider_checkout_id, provider_payment_intent_id, status ('created'|'paid'|'refunded'|'failed'|'canceled'), amount_total, currency, paid_at, metadata jsonb
- subscriptions (recurring)
  - id, user_id, product_id, provider, provider_subscription_id, status ('trialing'|'active'|'past_due'|'canceled'|'incomplete'), current_period_start, current_period_end, cancel_at_period_end
- entitlements (source of truth for access)
  - id, user_id, source ('subscription'|'voucher'|'grant'), product_id, scope, starts_at, ends_at, active
- vouchers (codes for one‑time unlocks)
  - id, product_id, code (unique), status ('available'|'redeemed'|'void'), redeemed_by, redeemed_at, expires_at
- provider_events (webhook audit)
  - id, provider, event_type, payload jsonb, signature_valid, received_at, processed_at, result ('success'|'error'), error_message

Indexes: entitlements(user_id, active, scope), subscriptions(user_id, status), vouchers(code, status), prices(product_id, is_active, region), provider_events(provider, received_at)

RLS: owners can read their purchases/subscriptions/entitlements; admin role for the Billing Admin app.

## 4) Provider Adapters
Interface (per gateway):
- createCheckoutSession({ userId, priceId, successUrl, cancelUrl }) → { url, provider_checkout_id }
- handleWebhook(event) → normalized actions (subscription created/updated/canceled, invoice paid/refunded, payment captured/failed, one‑time order)
- getPortalLink({ userId }) → string (optional)
- cancelSubscription({ providerSubscriptionId }) → result

Implementations: adapters/stripe.ts, adapters/razorpay.ts, adapters/paypal.ts.
Routing: choose provider via prices.provider or by region; UI remains agnostic.

## 5) API Surface
Public (authenticated):
- POST /billing/checkout { price_id }
- POST /billing/redeem-voucher { code }
- GET /billing/entitlements
- GET /billing/subscriptions
- POST /billing/cancel { subscription_id }
- GET /billing/portal (if provider supports portal)

Webhooks:
- POST /billing/webhook/stripe
- POST /billing/webhook/razorpay
- POST /billing/webhook/paypal

All webhooks: verify signature, store raw in provider_events, idempotently map to purchases/subscriptions/entitlements.

Admin (internal):
- CRUD: products, prices, vouchers
- List/search: purchases, subscriptions, entitlements
- Webhook logs: inspect/replay (staging only)
- Settings: region routing, trials, coupons, grace periods

## 6) UI Integration (Main App)
- Add AccessTier to types and surface on content (challenges, labs, certifications, redvsblue operations/season):
  - free, premium, challenge_pack:<slug>, cert:<code>, op:<slug>, season:<slug>
- Add entitlements helper:
  - useEntitlements() (fetch once), hasEntitlement(scope)
- Add Paywall component (reusable):
  - Shows “Included in your plan”, “Upgrade Plan”, “Buy One‑Time”, “Redeem Voucher” depending on catalog/entitlements
- Pages to touch lightly:
  - Challenges/Labs: lock start/attempt behind hasEntitlement based on access_tier
  - Red vs Blue: gate queue/join/start using op/season/app scopes; free ops bypass
  - Skill Path/Certification: exam CTA checks cert:<code> or cert:*; voucher redeem UI
  - Profile > Billing: current plan, renewal, entitlements, portal link

Existing progress and learning logic remains unchanged.

## 7) Red vs Blue Operations
- Each operation: access_tier = free | premium | op:<slug> | season:<slug>
- Entitlements:
  - redvsblue:ops:* (all ops), redvsblue:season:<slug>, redvsblue:op:<slug>
  - Optional: redvsblue:unlimited or credits model later
- Products:
  - Plan may include ops:* or season:<slug>
  - One‑time purchases for op:<slug> or season:<slug>
- UI gate: check entitlement per op/season; show Paywall when locked

## 8) Billing Admin (Separate App)
- Separate repo folder/app, internal network only
- Sections: Products & Prices, Content Access, Vouchers, Subscriptions, Purchases, Entitlements, Webhook Logs, Settings
- Security: admin auth only; provider secrets in server env (never in browser)

## 9) Rollout Phases
1) Schema + RLS + entitlements helper + Paywall component
2) Stripe adapter (test mode) + /billing routes + webhooks
3) Wire challenges/ops/certs gates + voucher redemption
4) Razorpay adapter (IN/UPI) + region routing in prices
5) Billing Admin MVP (catalog, vouchers, subscriptions, purchases, logs)
6) QA: e2e payments/entitlements, failure cases, retries
7) Launch; add advanced features (trials, coupons, prorations, season passes)

## 10) Acceptance Criteria
- UI never references provider; only entitlements
- Free/premium/pack/cert/op/season gating works with one helper
- Voucher redemption unlocks the correct scope immediately
- Plans can include specific certs/ops or all via wildcard
- Provider swap is a catalog/config change; no UI rewrites

## 11) Risks & Mitigations
- Webhook flakiness → store raw events, idempotent processing, alerting
- Duplicate entitlements → unique constraints + upserts
- Regional tax/invoicing → start simple; add Stripe Tax/Paddle later if needed
- Chargebacks/refunds → normalize status transitions and revoke entitlements accordingly

## 12) Testing
- Stripe test cards (subscribe/upgrade/cancel/refund), Razorpay sandbox (UPI/order capture), PayPal sandbox (optional)
- E2E: checkout → webhook → entitlement visible → gated content unlocks
- Voucher lifecycle: valid/expired/void, replay webhooks in staging

## 13) Timeline (indicative)
- Week 1: Schema, Stripe adapter, /billing endpoints, basic paywalls
- Week 2: Razorpay adapter, region routing, vouchers, certification/ops gates
- Week 3: Billing Admin MVP, QA, polish, telemetry
- Week 4: Launch + post‑launch enhancements (trials, coupons, season pass UX)
