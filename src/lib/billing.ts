// Billing domain types & entitlement helpers (provider-agnostic)

export type ProductType = 'plan' | 'voucher' | 'addon';
export type BillingCycle = 'one_time' | 'monthly' | 'yearly';
export type PurchaseStatus = 'created' | 'paid' | 'refunded' | 'failed' | 'canceled';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
export type EntitlementSource = 'subscription' | 'voucher' | 'grant';

// Entitlement scopes enumerated in logic_plan.md
export type EntitlementScope =
  | 'app'
  | 'challenges:all'
  | `challenge_pack:${string}`
  | `cert:${string}`
  | 'cert:*'
  | 'redvsblue:ops:*'
  | `redvsblue:op:${string}`
  | `redvsblue:season:${string}`
  | 'redvsblue:unlimited';

export interface Entitlement {
  id: string;
  user_id: string;
  product_id?: string | null;
  scope: EntitlementScope | string; // keep loose for forward compat
  starts_at?: string | null;
  ends_at?: string | null;
  active: boolean;
  source: EntitlementSource;
}

// Pattern precedence: exact > specific > wildcard fallback
// Matching rules: wildcard entries like cert:* or redvsblue:ops:* should satisfy cert:XYZ and redvsblue:op:slug
export function entitlementMatches(required: string, owned: string): boolean {
  if (required === owned) return true;
  // wildcard patterns
  if (owned === 'cert:*' && required.startsWith('cert:')) return true;
  if (owned === 'redvsblue:ops:*' && (required.startsWith('redvsblue:op:') || required.startsWith('redvsblue:season:'))) return true;
  if (owned === 'redvsblue:unlimited' && required.startsWith('redvsblue:')) return true;
  return false;
}

export function hasEntitlement(required: string, entitlements: Entitlement[] | undefined | null): boolean {
  if (!required) return true; // empty requirement = open
  if (!entitlements) return false;
  return entitlements.some(e => e.active && entitlementMatches(required, e.scope));
}

export function bestMatchingEntitlement(required: string, entitlements: Entitlement[]): Entitlement | undefined {
  // Score matches by specificity
  let best: { ent?: Entitlement; score: number } = { score: -1 };
  for (const e of entitlements) {
    if (!e.active) continue;
    if (!entitlementMatches(required, e.scope)) continue;
    let score = 0;
    if (e.scope === required) score = 100;
    else if (e.scope.includes('*')) score = 10; else score = 50; // mid specificity
    if (e.scope === 'redvsblue:unlimited') score = 5; // broadest
    if (score > best.score) best = { ent: e, score };
  }
  return best.ent;
}

export interface CheckoutSession {
  url: string;
  provider_checkout_id: string;
}

// Mock client-side placeholder to be replaced by real API calls
export async function mockCheckout(priceId: string): Promise<CheckoutSession> {
  // would call /billing/checkout
  return { url: `/mock/checkout/${priceId}`, provider_checkout_id: 'mock_' + priceId };
}
