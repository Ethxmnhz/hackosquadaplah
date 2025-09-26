# Billing Next Steps

This file summarizes remaining implementation tasks mapped to the original `logic_plan.md` and newly added adapter layer.

## High Priority
1. Stripe Adapter
   - Implement edge functions: `checkout-stripe`, `webhook-stripe` using Sessions + Webhook secret.
   - Map events to purchases/subscriptions identical to Razorpay path (normalize statuses).
   - Reuse adapter interface in `providers.ts` once server abstraction is migrated (currently client still calls edge functions directly).
2. Voucher Redemption Hardening
   - Create SQL function `redeem_voucher_code(p_code text)` performing: row lock (SELECT ... FOR UPDATE), status check, mark redeemed, call `grant_product_entitlements` in one transaction.
   - Update edge function to call SQL function; return entitlement scopes granted.
3. Admin Auth Guard
   - Add RLS-friendly admin claim (JWT custom claim or `app_metadata.role` == 'admin').
   - In billing-admin app, create `useAdmin()` hook that redirects if not admin; wrap routes.
4. Catalog Management (Admin)
   - CRUD pages for products (create/update name, description, entitlement_scopes) and prices (activate/deactivate, region, currency, amount, provider).
   - Use optimistic UI + direct Supabase upserts (service role) via edge functions for security.
5. Subscription Activation UX
   - After Razorpay order success / subscription creation, immediate optimistic entitlement placeholder while polling final activation.
   - Toast/banner with state machine (pending -> active | timeout -> manual refresh CTA).

## Medium Priority
6. Event Reprocessor Automation
   - Scheduled invocation (cron) of `process-events` edge fn.
   - Add query for `provider_events` older than 2m with `processed_at IS NULL`.
7. Refund / Revocation Enhancements
   - Implement webhook mapping for Razorpay refunds; ensure entitlements revoked via functions.
   - Add optional grace period (table `product_revocation_policy`).
8. Region & Currency Routing
   - Extend prices with region filtering (already has region field if added later) – pass `region` from client (geo/IP or user profile).
   - Group prices by billing cycle & present localized currency formatting.
9. Paywall Expansion
   - Replace placeholder upgrade/purchase actions with dynamic product selection modal sourced from catalog.
   - Auto-suggest cheapest price providing required scope.
10. Content Gating Coverage
   - Challenges, Certifications, Operations / Seasons: ensure each access path checks `hasEntitlement(requiredScope)`.

## Low Priority / Future
11. Portal Links (Stripe first)
   - Add adapter `getPortalLink` usage in billing page (Manage subscription link).
12. Analytics & Dashboard Widgets
   - MRR, Active Subs, Churn (basic queries + charts).
13. Tests
   - Unit: entitlement matcher, scope wildcard resolution.
   - Integration: voucher redemption race, webhook -> entitlement grant, subscription renewal.
14. Observability
   - Structured logging for edge functions, add tracing IDs.
   - Alert on high error rate in provider_events.
15. Grace Period Strategy Implementation
   - Apply grace logic in revoke functions if configured.

## File Locations of Interest
- `src/lib/providers.ts`: adapter contract (expand when implementing Stripe/PayPal)
- `supabase/functions/billing/*`: existing edge functions (add new provider-specific ones here)
- `supabase/migrations/*`: add voucher SQL function + revocation policy table.

## Suggested Sequence
1) Voucher SQL function + admin guard.
2) Stripe adapter (checkout + webhook) -> verify dual-provider stability.
3) Admin CRUD for catalog + price activation toggles.
4) Expanded paywall & dynamic upgrade modal.
5) Region-aware pricing + tests.

---
Generated: (auto) Keep this file updated after each major billing-related PR.
