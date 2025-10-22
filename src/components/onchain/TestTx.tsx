import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { explorerTxUrl } from '../../onchain/wagmi';

export default function TestTx() {
  const { address, isConnected } = useAccount();
  const { data: hash, isPending, error, sendTransaction } = useSendTransaction();

  const onSend = () => {
    if (!address) return;
    // Send the smallest possible 0 ETH tx with an explicit gas limit (wallet may override)
    sendTransaction({ to: address, value: parseEther('0') });
  };

  if (!isConnected) return null;

  return (
    <div className="mt-6 p-4 border border-red-500/30 rounded-xl bg-[#0A030F] text-gray-200 space-y-2">
      <div className="font-semibold text-white">Quick Test Transaction</div>
      <p className="text-sm text-gray-400">This sends a 0 ETH transaction to your own address on Base Sepolia.</p>
      <button
        onClick={onSend}
        disabled={isPending}
        className="px-3 py-2 rounded-lg border border-red-500/40 hover:border-red-400 text-sm"
      >
        {isPending ? 'Sending…' : 'Send 0 ETH tx'}
      </button>
      {hash && (
        <div className="text-sm">
          Tx: <a className="text-red-300 underline" href={explorerTxUrl(hash)} target="_blank" rel="noreferrer">{hash}</a>
        </div>
      )}
      {error && <div className="text-sm text-rose-400">{error.message}</div>}
    </div>
  );
}
