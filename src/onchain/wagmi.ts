import { createConfig, http } from 'wagmi';
import { fallback } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors';

// Base Sepolia RPC (public) with fallback and retries
const transport = fallback([
  http('https://base-sepolia-rpc.publicnode.com', { retryCount: 2 }),
  http('https://sepolia.base.org', { retryCount: 2 }),
  http('https://base-sepolia.blockpi.network/v1/rpc/public', { retryCount: 2 }),
  http('https://base-sepolia.g.alchemy.com/v2/demo', { retryCount: 2 }), // Alchemy public demo
  http('https://base-sepolia.gateway.tenderly.co', { retryCount: 2 }),   // Tenderly public gateway
  http('https://1rpc.io/base-sepolia', { retryCount: 2 }),              // 1RPC community endpoint
  // Additional public endpoints (if any new ones are found, add here):
  http('https://base-sepolia.alt.technology', { retryCount: 2 }),        // Example: Alt Technology (if available)
  http('https://base-sepolia.public.blastapi.io', { retryCount: 2 }),    // Example: BlastAPI (if available)
  http('https://base-sepolia.chainnodes.org', { retryCount: 2 }),        // Example: Chainnodes (if available)
]);

const wcProjectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: 'HackOSquad' }),
    ...(wcProjectId
      ? [
          walletConnect({
            projectId: wcProjectId,
            showQrModal: true,
          }),
        ]
      : []),
  ],
  transports: {
    [baseSepolia.id]: transport,
  },
});

export const EXPLORER_BASE = 'https://sepolia.basescan.org';

export function explorerTxUrl(hash: string) {
  return `${EXPLORER_BASE}/tx/${hash}`;
}
