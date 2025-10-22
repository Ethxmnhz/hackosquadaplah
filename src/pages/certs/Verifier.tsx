import { useState } from 'react';
import { usePublicClient } from 'wagmi';
import { EXPLORER_BASE } from '../../onchain/wagmi';
import { getClaimByTx } from '../../lib/claims';

export default function Verifier() {
  const publicClient = usePublicClient();
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  async function onVerify() {
    setError(undefined);
    setResult(null);
    if (!hash) return setError('Paste a transaction hash');
    if (!publicClient) return setError('RPC client not available');
    const cleaned = hash.trim();
    const txHash = cleaned.startsWith('0x') ? (cleaned as `0x${string}`) : (`0x${cleaned}` as `0x${string}`);
    setLoading(true);
    try {
      // First try Supabase lookup for speed/reliability
      try {
        const { data } = await getClaimByTx(txHash as string);
        if (data) {
          setResult({
            source: 'supabase',
            tx: data.tx_hash,
            block: data.created_at,
            status: 'stored',
            metadata_name: data.metadata_name,
            metadata_image: data.metadata_image,
            token_id: data.token_id,
            contract: data.contract_address,
            chain_id: data.chain_id,
            raw: data,
          });
          return;
        }
      } catch (e) {
        // ignore supabase errors and fall back to on-chain
      }
      // Try to read receipt and parse logs minimally
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (!receipt) throw new Error('Transaction not found');
      // Basic metadata: blockNumber, transactionHash, status
      const info: any = {
        source: 'onchain',
        tx: receipt.transactionHash,
        block: receipt.blockNumber,
        status: receipt.status,
      };

      // Try to parse Transfer event and tokenId if available (quick scan below)

      // Attempt to find tokenId from logs by inspecting topics for Transfer (keccak of Transfer(address,address,uint256))
      try {
        const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        for (const l of receipt.logs || []) {
          if (l.topics && l.topics[0] && l.topics[0].toLowerCase() === TRANSFER_TOPIC) {
            // tokenId is typically topic[3] (indexed uint256) for ERC721 Transfer
            const tok = l.topics[3] || l.topics[2];
            if (tok) {
              try {
                const id = BigInt(tok);
                info.token_id = id.toString();
                info.contract = l.address;
                break;
              } catch {}
            }
          }
        }
      } catch {}

      // If we have contract + token_id, try to read tokenURI
      if (info.contract && info.token_id && publicClient) {
        try {
          const abi = [{ type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] }];
          const uri = await publicClient.readContract({ address: info.contract as `0x${string}`, abi: abi as any, functionName: 'tokenURI', args: [BigInt(info.token_id)] });
          const uriStr = typeof uri === 'string' ? uri : undefined;
          info.token_uri = uriStr;
          if (uriStr && uriStr.startsWith('data:application/json')) {
            const [, payload] = uriStr.split(',', 2);
            const json = decodeURIComponent(payload);
            try { info.metadata = JSON.parse(json); } catch {}
          }
        } catch {}
      }

      setResult(info);
    } catch (e: any) {
      setError(e?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="card p-6 glass-effect">
        <h1 className="text-2xl font-semibold text-white">Certificate Verifier</h1>
        <p className="text-gray-300 mt-2">Paste a transaction hash to verify a claimed certificate on Base Sepolia.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="form-input md:col-span-2" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="0x... transaction hash" />
          <div>
            <button className="btn btn-primary w-full" onClick={onVerify} disabled={loading}>{loading ? 'Checking…' : 'Verify'}</button>
          </div>
        </div>

        {error && <div className="mt-4 text-rose-400">{error}</div>}

        {result && (
          <div className="mt-4 p-4 rounded border border-slate-700 bg-slate-900">
            <div className="text-lg font-semibold text-green-300">VERIFIED ✅</div>
            <div className="mt-2 text-sm text-gray-200">Transaction: <a className="underline text-red-300" href={`${EXPLORER_BASE}/tx/${result.tx}`} target="_blank" rel="noreferrer">{result.tx}</a></div>
            {result.token_id && <div className="text-sm text-gray-400">Token ID: {String(result.token_id)}</div>}
            {result.contract && <div className="text-sm text-gray-400">Contract: <span className="font-mono">{String(result.contract)}</span></div>}
            {result.chain_id && <div className="text-sm text-gray-400">Chain: {String(result.chain_id)}</div>}
            {result.metadata_name && <div className="mt-2 text-sm font-medium text-white">{result.metadata_name}</div>}
            {result.metadata_image && <div className="mt-2"><img src={result.metadata_image} alt="certificate" className="max-h-48 rounded" /></div>}
            {result.metadata && result.metadata.name && <div className="mt-2 text-sm font-medium text-white">{result.metadata.name}</div>}
            {result.metadata && result.metadata.image && <div className="mt-2"><img src={result.metadata.image} alt="certificate" className="max-h-48 rounded" /></div>}
            <div className="mt-2 text-sm text-gray-400">Source: {result.source}</div>
          </div>
        )}
      </div>
    </div>
  );
}
