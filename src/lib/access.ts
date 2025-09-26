// Maps a content row's access_tier to an entitlement scope required.
// 'free' returns null (no paywall). 'hifi' maps to 'hifi'. Extend as needed.
export function requiredEntitlementForTier(access_tier?: string | null): string | null {
  if (!access_tier || access_tier === 'free') return null;
  if (access_tier === 'hifi') return 'hifi';
  return access_tier; // fallback direct mapping for future tiers
}
