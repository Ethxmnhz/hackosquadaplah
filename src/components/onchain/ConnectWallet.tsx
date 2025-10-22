import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

export default function ConnectWallet() {
  const { isConnected, address } = useAccount();
  const { connectors, connect, isPending: isConnecting, error: connectError, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

  const onSwitch = () => switchChain({ chainId: baseSepolia.id });

  if (!isConnected) {
    const hasProvider = typeof window !== 'undefined' && (window as any).ethereum ? true : false;
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {connectors.map((c) => {
          const disabled = isConnecting; // allow click even if not ready, to surface wallet UI/errors
          const label = `Connect ${c.name}`;
          return (
            <button
              key={c.uid}
              onClick={() => connect({ connector: c, chainId: baseSepolia.id })}
              disabled={disabled}
              title={!c.ready ? 'Wallet not detected by page; clicking will still try to connect.' : ''}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', opacity: disabled ? 0.6 : 1 }}
            >
              {label}
            </button>
          );
        })}
        {isConnecting && <span style={{ color: '#aaa' }}>Waiting for wallet…</span>}
        {connectError && <span style={{ color: 'crimson' }}>{connectError.message}</span>}
        {connectStatus === 'error' && !connectError && (
          <span style={{ color: 'crimson' }}>Failed to connect. Check your wallet popup and try again.</span>
        )}
        <span style={{ color: '#888' }}>Provider detected: {hasProvider ? 'Yes' : 'No'}</span>
      </div>
    );
  }

  const onBase = chainId === baseSepolia.id;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'monospace' }}>{address}</span>
      {!onBase && (
        <button onClick={onSwitch} disabled={isSwitching} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #888' }}>
          {isSwitching ? 'Switching…' : 'Switch to Base Sepolia'}
        </button>
      )}
      <button onClick={() => disconnect()} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #888' }}>
        Disconnect
      </button>
      {switchError && <span style={{ color: 'crimson' }}>{switchError.message}</span>}
    </div>
  );
}
