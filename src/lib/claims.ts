import { supabase } from './supabase';

export interface OnchainClaim {
  id?: string;
  user_id?: string;
  address: string;
  path_id?: string;
  token_id: string;
  tx_hash: string;
  token_uri?: string;
  metadata_name?: string;
  metadata_image?: string;
  chain_id?: number;
  contract_address?: string;
  created_at?: string;
}

export async function saveClaim(claim: OnchainClaim) {
  const payload = {
    ...claim,
    created_at: claim.created_at || new Date().toISOString(),
  };
  // Insert a new history row for every mint; relies on unique(tx_hash) to avoid dupes
  const { data, error } = await supabase
    .from('onchain_claims')
    .insert([payload as any])
    .select()
    .single();
  return { data, error };
}

export async function getClaimsByAddress(address: string) {
  const { data, error } = await supabase
    .from('onchain_claims')
    .select('*')
    .eq('address', address.toLowerCase())
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getExistingClaim(address: string, path_id?: string) {
  // Guard requires both address and path to match, otherwise we don't block
  if (!path_id) return { data: null, error: null } as const;
  let query = supabase
    .from('onchain_claims')
    .select('*')
    .eq('address', address.toLowerCase())
    .eq('path_id', path_id);
  // Return most recent if multiple
  // @ts-ignore - order types can be loose depending on supabase-js version
  query = query.order('created_at', { ascending: false }).limit(1);
  // maybeSingle: return null if none
  // @ts-ignore
  const { data, error } = await query.maybeSingle();
  return { data, error };
}

export async function getClaimByTx(tx_hash: string) {
  if (!tx_hash) return { data: null, error: null } as const;
  const { data, error } = await supabase
    .from('onchain_claims')
    .select('*')
    .eq('tx_hash', tx_hash)
    .limit(1)
    .maybeSingle();
  return { data, error };
}
