import ConnectWallet from '../../components/onchain/ConnectWallet';
import { useAccount, useChainId } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import TestTx from '../../components/onchain/TestTx';

export default function OnchainTestPage() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const onBase = chainId === baseSepolia.id;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-white">Onchain Test</h1>
      <p className="text-gray-300">Connect your wallet and ensure you are on Base Sepolia.</p>
      <ConnectWallet />
      <TestTx />
      <div className="mt-4 text-sm text-gray-300">
        <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
        {isConnected && <div>Address: <span className="font-mono">{address}</span></div>}
        <div>Network: {onBase ? 'Base Sepolia' : `Chain ID ${chainId}`}</div>
      </div>
    </div>
  );
}
