// Unified payment provider adapter interfaces & current Razorpay placeholder.
// This creates a stable contract so future Stripe/PayPal additions do not affect UI logic.

export interface CreateCheckoutParams {
  userId: string;
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  provider: string;
  url?: string; // For redirect-based providers (Stripe hosted page, etc.)
  order_id?: string; // Razorpay order
  amount?: number;
  currency?: string;
  key?: string; // Public key if needed client side
}

export interface CreateSubscriptionParams {
  userId: string;
  priceId: string;
  trialDays?: number;
}

export interface SubscriptionResult {
  provider: string;
  provider_subscription_id?: string;
  status?: string;
  short_url?: string; // Razorpay hosted subscription link
}

export interface ProviderAdapter {
  name: string; // 'razorpay' | 'stripe' | 'paypal'
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSession>;
  createSubscription?(params: CreateSubscriptionParams): Promise<SubscriptionResult>;
  cancelSubscription?(providerSubscriptionId: string): Promise<{ success: boolean; status?: string; error?: string }>;
  getPortalLink?(userId: string): Promise<string | null>;
}

// Registry pattern to allow runtime selection; currently only a Razorpay placeholder.
const registry: Record<string, ProviderAdapter> = {};

export function registerProvider(adapter: ProviderAdapter) {
  registry[adapter.name] = adapter;
}

export function getProvider(name: string): ProviderAdapter | undefined {
  return registry[name];
}

// Razorpay stub (server-side logic actually lives in edge functions; this is illustrative for future SSR refactors)
export const razorpayAdapter: ProviderAdapter = {
  name: 'razorpay',
  async createCheckoutSession(_params) {
    // Delegate to existing edge function; keep shape consistent
    return { provider: 'razorpay' } as CheckoutSession;
  },
  async createSubscription(_params) {
    return { provider: 'razorpay', status: 'incomplete' };
  },
  async cancelSubscription(_id: string) {
    return { success: true, status: 'canceled' };
  },
  async getPortalLink() { return null; }
};

// Auto-register Razorpay stub so imports can rely on presence.
registerProvider(razorpayAdapter);
