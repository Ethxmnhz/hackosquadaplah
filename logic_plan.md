# Payments & Subscriptions: Technical Execution Plan

This document details exactly what we’ll build, why, and how—so we can sell monthly plans, one‑time vouchers (certifications, ops, season passes), support free content, and swap payment gateways without touching app logic.

## 1) Objectives
- Offer 2–3 monthly plans (Basic/Pro/Elite) across regions and currencies.
- Keep some challenges/operations/certifications free.
- Gate premium content and operations by plan or one‑time purchases (vouchers, ops, season passes).
- Sell certification vouchers separately; also include certs inside plans.
- Support multiple gateways (Stripe, Razorpay, PayPal). Switching should not require UI rewrites.
- Run a separate, internal Billing Admin panel for catalog, vouchers, pricing, and auditing.

### Implementation Status (2025-09-25)
Initial provider-agnostic billing layer scaffolded:
- Core tables & RLS added (products, prices, purchases, subscriptions, entitlements, vouchers, provider_events).
- TypeScript helpers (`lib/billing.ts`) and `useEntitlements` hook implemented.
- Reusable `Paywall` component created (mock upgrade / purchase / voucher actions).
- Mock Supabase Edge Functions (`supabase/functions/billing/*`) for checkout & voucher redemption returning placeholder data (provider currently set to `mock`).
- Client API helpers appended to `lib/api.ts`.

Next steps before real payments:
1. Implement Stripe adapter & secure server-side session creation.
2. Webhook ingestion -> normalized entitlement grants.
3. Voucher redemption logic (atomic code claim + entitlement grant).
4. Pricing catalog UI & mapping from content access tiers to product scopes.
5. Admin panel for managing products/prices/vouchers.

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

---
### Implementation Status (2025-09-25)
Core billing scaffold implemented:
- Schema: products, prices, purchases, subscriptions, entitlements, vouchers, provider_events
- Enhancements: entitlement_scopes on products, entitlements_effective view (dynamic active flag)
- Functions: grant_entitlement, grant_product_entitlements
- Edge Functions (mock / service role): checkout, redeem-voucher (with entitlement grants), catalog, entitlements (legacy), plus Paywall component & useEntitlements hook.
- Client helpers: billingCheckout, getCatalog, redeemVoucher, getEntitlements / subscriptions.

Pending for full production billing:
- Real payment provider adapters (Stripe first) & webhook processors
- Event idempotency + subscription lifecycle reconciliation
- Voucher redemption race-hardening via SQL function WITH LOCK (current optimistic approach acceptable for low contention)
- Admin UI (catalog management, voucher generation, logs)
- Plan catalog pricing per region + provider routing logic
- Entitlement revocation on refunds / cancellations at period end
- Tests (unit: entitlement matcher, integration: voucher redemption & checkout flow)

Migration Path to Provider Integration:
1. Add stripe_prices mapping (optionally separate table) or reuse provider_price_id in prices
2. Implement /billing/webhook/stripe storing provider_events + mapping to purchases/subscriptions
3. Replace checkout edge function body with Stripe session creation; keep return signature stable
4. Incrementally add Razorpay/PayPal using same adapter interface once Stripe path proven

Security Notes:
- RLS write operations restricted to service role policies (auth.role() = 'service_role'); add custom JWT claim if needed
- Client reads via entitlements_effective view; do not expose raw provider identifiers to UI

Performance Considerations:
- Add partial index on entitlements(user_id) WHERE starts_at <= now() AND (ends_at IS NULL OR ends_at > now()) if query volume grows
- Consider materialized view or caching for catalog if product count increases significantly

---
### Razorpay Integration (Initial Provider)
Current State:
- Checkout function now branches on `prices.provider`. For `razorpay`, returns mock `order_id` (placeholder) until real API call added.
- Webhook receiver `webhook-razorpay.ts` stores raw events in `provider_events` with `external_event_id` for idempotency.

Next Steps to Fully Enable Razorpay:
1. Real order creation: server-side POST to Razorpay Orders API using `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (basic auth) sending amount in smallest currency unit.
2. Client receives `order_id`, forwards `key_id` + order details to Razorpay Checkout SDK.
3. On success, Razorpay posts payment.captured to webhook; map that to a purchase row + entitlement grants (use `grant_product_entitlements`).
4. For subscriptions, use Razorpay subscription APIs: events `subscription.charged`, `subscription.completed`, `subscription.cancelled`.
5. Add signature verification for checkout completion on client if using manual verification flow.
6. Implement event processor job/function that reads unprocessed provider_events and applies state transitions (idempotent upsert logic).

Provider Swap Strategy:
- `prices.provider` drives routing; adding Stripe later only requires adding a create-checkout branch + a new webhook handler.
- Keep all entitlement granting logic inside shared functions; providers only normalize events.

Security Notes:
- Never expose secret keys to client; only pass public key_id.
- Use a dedicated webhook secret in `RAZORPAY_WEBHOOK_SECRET` and rotate periodically.

Open TODOs (Razorpay):
- Implement real order API request.
- Map payment.captured → create purchase (status=paid) + grant entitlements.
- Add retry & dead-letter strategy for failed grants.

---
### Update (Front-End & Processing Integration 2025-09-25 Later)
Implemented Since Last Section:
- Real Razorpay order creation in `checkout` edge function (POST to Orders API, returns `order_id` + public key, inserts draft purchase row status=created).
- Webhook `payment.captured` processing: idempotent storage + amount/currency verification + entitlement grants from product scopes; duplicate event short‑circuit.
- Added idempotency safeguards (duplicate detection via `external_event_id`, skip if already success) and mismatch guard (throws on `amount_mismatch`).
- Billing UI page (`/billing`) listing catalog products with price buttons initiating checkout (Razorpay path surfaces follow-up pay modal state).
- Razorpay client integration stub with dynamic script loader & `RazorpayButton` component that opens checkout modal using returned `order_id` & key.
- Paywall integrated into Operations page gating content using scope `operations:access` (example entitlement requirement).
- Profile page now shows current entitlements via `EntitlementsList` component for quick visibility.

Outstanding (Next Focus):
1. Auto-refresh entitlements on client after successful Razorpay payment (poll or lightweight `/billing/entitlements` refetch triggered by handler callback + short delay for webhook processing).
2. Subscription event handling `subscription.authenticated|activated|charged|completed|paused|cancelled` mapping to `subscriptions` + time‑bound entitlements.
3. Revoke / adjust entitlements on refund or failed renewal (Razorpay events) – add refund handling branch.
4. Background reprocessor for stuck events: scan `provider_events` where `result IS NULL` or `signature_valid=true AND processed_at IS NULL` beyond threshold.
5. Consolidate entitlement granting loops into single SQL function call for batch performance (optional now).
6. Add region-aware catalog filtering in UI (pass region param to `getCatalog`).
7. Secure voucher redemption UI path integrated into Paywall (currently static buttons).
8. Tests: unit (entitlementMatches, bestMatchingEntitlement), integration mock for webhook -> entitlement grant path.

Status Quick Table:
| Area | Status |
|------|--------|
| Schema & Views | Complete (initial) |
| Checkout (Razorpay one-time) | Implemented (orders + draft purchase) |
| Webhook Storage | Implemented (idempotent) |
| Webhook Processing (payments) | Implemented (payment.captured) |
| Webhook Processing (subscriptions) | Implemented (status + entitlement mapping) |
| UI Billing Catalog | Implemented (basic) |
| Razorpay Client Modal | Implemented (basic loader) |
| Paywall Integration Example | Implemented (Operations) |
| Entitlements Display | Implemented (Profile) |
| Voucher UI | Implemented (Paywall) |
| Retry / Reprocessor | Implemented (process-events edge fn) |
| Tests | Pending |
| Admin Panel | Pending |
| Refund / Revocation Logic | Implemented (purchase/subscription linkage + revoke functions) |

### Subscription System Implementation (Razorpay)
Implemented Components:
- Edge Function `create-subscription`: creates Razorpay plan (on-demand), creates subscription (infinite), inserts local row with status `incomplete`.
- Edge Function `cancel-subscription`: cancels provider subscription (cycle-end) and updates local status or `cancel_at_period_end`.
- Webhook Enhancements: Added processing of `subscription.*` events mapping Razorpay statuses → local (`incomplete`, `active`, `past_due`, `canceled`).
- Period Handling: Converts `current_start` / `current_end` epoch seconds to ISO and updates `subscriptions.current_period_start`/`current_period_end`.
- Entitlement Grant: On transition to `active`, grants product entitlement scopes with duration approximated from period length in days (if start/end provided).
- Missing Subscription Race: If webhook arrives before local row, inserts minimal subscription row using notes metadata (product_id, user_id) available from Razorpay.

Status Mapping:
| Razorpay | Local |
|----------|-------|
| created / authenticated | incomplete |
| active | active |
| paused | past_due |
| halted | past_due |
| completed | canceled (natural end) |
| cancelled | canceled |

Open Gaps / Next Steps:
- Distinguish between natural completion vs user cancellation for analytics.
- Handle refund / charge failure events to revoke entitlements (currently only additive on active).
- Optimize plan creation (cache & reuse per product/period/currency instead of per subscription request).
- Implement webhook reprocessor & dead-letter queue for failed subscription grant attempts.
- Add client polling or event-driven refresh after subscription activation for immediate UX update.
 - Implement automated revocation grace periods (currently immediate) configurable per product.
 - Implement test suite for entitlement matching, voucher redemption race, webhook lifecycle.

### Entitlement Linkage & Revocation (2025-09-25 Update)
Implemented purchase/subscription provenance columns and helper functions:

Schema Additions:
- entitlements.origin_purchase_id (FK -> purchases.id)
- entitlements.origin_subscription_id (FK -> subscriptions.id)
Indexes for both columns added.

Functions:
- grant_purchase_entitlements(p_purchase, p_duration_days)
- grant_subscription_entitlements(p_subscription, p_duration_days)
- revoke_purchase_entitlements(p_purchase)
- revoke_subscription_entitlements(p_subscription)

Processing Changes:
- payment.captured → updates purchase.status=paid then calls grant_purchase_entitlements (origin linkage recorded).
- payment.refunded → updates purchase.status=refunded then calls revoke_purchase_entitlements (immediate soft revoke sets active=false & ends_at=now()).
- subscription.* events: when mapped status becomes active → grant_subscription_entitlements (duration derived from current_period_start/end). When mapped status becomes canceled → revoke_subscription_entitlements.

Revocation Strategy (Current):
- Immediate soft revoke: active=false + ends_at=now() preserves audit trail.
- Future enhancement: per-product configurable grace_period_days; functions would compare now() < ends_at + grace interval before deactivation.

Audit & Idempotency:
- Because revoke functions operate only on active entitlements for the given origin id, repeated webhook replay is safe.
- Grant functions insert new entitlement rows each activation cycle (e.g., renewed subscription) rather than mutating historic rows, enabling period history analytics.

Follow-Up (Planned Enhancements):
- Add view entitlements_effective already accounts for ends_at; can extend with future grace logic.
- Introduce table product_revocation_policy(product_id, grace_period_days, behavior) driving conditional logic in revoke functions.

### Implemented User-Facing Billing Routes & UI (2025-09-25 Later Update)
Edge Functions (Supabase):
- /functions/v1/billing/catalog (GET) → products + prices (region aware)
- /functions/v1/billing/checkout (POST) → one-time Razorpay order (draft purchase)
- /functions/v1/billing/create-subscription (POST) → Razorpay subscription creation
- /functions/v1/billing/cancel-subscription (POST) → cancel or mark cancel_at_period_end
- /functions/v1/billing/webhook-razorpay (POST) → webhook ingest + lifecycle mapping
- /functions/v1/billing/redeem-voucher (POST) → voucher claim + entitlements
- /functions/v1/billing/entitlements (GET) → effective entitlements (view fallback)
- /functions/v1/billing/subscriptions (GET) → user subscriptions
- /functions/v1/billing/purchases (GET) → recent purchases
- /functions/v1/billing/process-events (POST) → background reprocessor (manual trigger)

Client API Helpers Added:
- getCatalog, billingCheckout, getEntitlements, getSubscriptions, getPurchases, createSubscription, cancelSubscription

Billing UI Enhancements:
- Billing page now displays: catalog products, purchase buttons, subscription create buttons, effective entitlements, subscriptions list with cancel action, recent purchases list, Razorpay payment modal flow.
- Added subscription create & cancel flows wired to new endpoints.

Remaining UI Tasks (Future):
- Voucher redemption integrated directly on Billing page (currently via Paywall context; can consolidate).
- Admin billing dashboard (products/prices/vouchers/entitlements) not yet built.
 - Billing modal product list currently static placeholder; wire to catalog for dynamic options.

### Billing Modal & Admin Page (2025-09-25 Addendum)
Added Components:
- BillingContext & BillingProvider: global modal control (upgrade/purchase flows).
- BillingModal: in-app overlay with starter/pro/one-time/voucher placeholders.
- Paywall now triggers BillingModal instead of static buttons.
- BillingAdminPage: read-only analytics snapshot (products, prices, entitlements, vouchers).

Routes Added:
- /billing (user catalog & account view) — ensured router entry.
- /admin/billing (admin overview) — requires admin guard.

Next Enhancements:
- Replace static modal cards with live catalog (reuse getCatalog + client selection logic).
- Add actionable buttons in modal to call checkout/subscription endpoints.
- Integrate voucher redemption form directly inside modal.

