# Local Edge Functions Dev (Docker-Less Strategy)

You reported 404s calling `/functions/v1/purchase-content` in Vite dev because the Supabase local edge runtime (which relies on Docker) is not running.

This project now uses an invoke-first strategy:

1. Primary path: `supabase.functions.invoke('function-name', { body })` – always reaches the hosted Supabase project (no Docker needed locally).
2. Fallback path: direct `fetch('/functions/v1/function-name')` – only used if invoke fails with a network error (e.g., offline or self-host scenario).

## Updated Utilities
Centralized in `src/lib/payments.ts`:
- `createPlanOrder`, `verifyPlan`
- `createContentPurchase`, `verifyContentPurchase`
- `diagPlan`, `diagPurchase`

Each tries invoke first; if that throws a network-ish error (`Failed to fetch`), it falls back to a relative fetch.

## Why 404 Happened
Vite dev server has no handler for `/functions/v1/*`. Without the local Supabase CLI reverse proxy + Docker containers, those routes don't exist.

## Deploying Functions
Deploy (once) so invoke works:

```
supabase functions deploy pay-plan --no-verify-jwt
supabase functions deploy purchase-content --no-verify-jwt
```

Ensure project ref context or run inside a folder with a valid `supabase/config.toml`.

## Environment Variables (Supabase Project Settings)
Set (Project Settings > Configuration):
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET` (or `RAZORPAY_SECRET`)
- `SUPABASE_SERVICE_ROLE_KEY` (already present, do NOT expose to client)
- Optional: `RAZORPAY_MOCK_MODE=1` for test orders without hitting Razorpay.

## Local .env (Frontend)
Provide:
```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
```
Restart Vite after changes.

## Testing Flow (Content Purchase)
1. Load a certification page showing a price.
2. Click Buy → order create via invoke.
3. If mock mode: immediate verify with synthetic IDs.
4. Hook forces access refresh with `force=true` to bypass cache.
5. UI updates to unlocked state.

## Diagnostics
Run diag endpoints in a console:
```ts
import { diagPlan, diagPurchase } from '@/lib/payments';
await diagPlan();
await diagPurchase();
```
Expect `{ ok: true, mock: true/false }` style responses.

## Troubleshooting
| Symptom | Likely Cause | Fix |
| ------- | ------------ | --- |
| 404 /functions/v1/... | No local edge runtime | Rely on invoke path (already default) |
| invoke error: 401 | Missing auth session | Ensure user logged in; refresh token |
| `MISSING_SERVICE_CREDS` | Service key not set in project env | Add `SUPABASE_SERVICE_ROLE_KEY` in dashboard |
| `NO_INDIVIDUAL_PRICE` | Entitlement has no price | Set price in Billing Admin Certificates |
| Always Free after price set | Cache or unauthenticated | Sign in or force refresh (handled automatically after purchase) |

## Future Enhancements
- Add retry/backoff wrapper for transient network errors.
- Expose a unified `purchaseManager` with event emitter for UI components.
- Integrate webhook reconciliation (not needed for mock mode).

---
Document last updated: 2025-09-28
