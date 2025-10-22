import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { isAddress, parseEventLogs } from 'viem';
import { explorerTxUrl, EXPLORER_BASE } from '../../onchain/wagmi';
import { useLocation } from 'react-router-dom';
import { getSkillPath } from '../../lib/api';
import ConnectWallet from '../../components/onchain/ConnectWallet';
import { useAuth } from '../../hooks/useAuth';
import { getExistingClaim, saveClaim } from '../../lib/claims';

const CERT_ADDR = (import.meta.env.VITE_CERT_NFT_ADDRESS?.trim?.() || undefined) as `0x${string}` | undefined;
const DEFAULT_TOKEN_URI = '/certificates/sample.json';

function short(s?: string, head = 6, tail = 4) {
  if (!s) return '';
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

// Minimal ABI covering common mint functions
const ABI = [
  {
    type: 'function',
    name: 'mintTo',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'safeMint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

export default function ClaimCertificate() {
  const { user } = useAuth();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const onBase = chainId === baseSepolia.id;
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  // Token URI is always built from the official template now
  const [tokenUri] = useState(DEFAULT_TOKEN_URI);
  const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { data: receipt, isLoading: waiting } = useWaitForTransactionReceipt({ hash: txHash });
  const publicClient = usePublicClient();
  const location = useLocation();
  const [eligible, setEligible] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [pathTitle, setPathTitle] = useState<string | undefined>(undefined);
  const [pathId, setPathId] = useState<string | undefined>(undefined);

  // Personalization controls (always personalized via official template)
  const usePersonalized = true as const;
  const [recipientName, setRecipientName] = useState<string>('');
  const [mintedTokenId, setMintedTokenId] = useState<bigint | undefined>(undefined);
  const [resolvedTokenUri, setResolvedTokenUri] = useState<string | undefined>(undefined);
  const [resolvedMetadata, setResolvedMetadata] = useState<any | undefined>(undefined);
  const [alreadyClaimed, setAlreadyClaimed] = useState<{ tx?: string; tokenId?: string; when?: string } | null>(null);
  const [txTimeIso, setTxTimeIso] = useState<string | undefined>(undefined);

  // Read query params for pathId/title
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pathId = params.get('pathId');
    const title = params.get('title') || undefined;
    if (title) setPathTitle(title);
    if (pathId) setPathId(pathId);
    if (pathId) {
      setChecking(true);
      getSkillPath(pathId).then((res: any) => {
        if (res?.success && res.data?.user_progress?.status === 'completed') {
          setEligible(true);
        } else {
          setEligible(false);
        }
      }).finally(() => setChecking(false));
    } else {
      // If no pathId, don’t block, but mark as not verified
      setEligible(false);
    }
  }, [location.search]);

  // Seed recipient name with address short form on connect
  useEffect(() => {
    if (address && !recipientName) {
      const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
      setRecipientName(short);
    }
  }, [address]);

  // Local single-claim guard (demo): prevent duplicate claims per address+pathId
  useEffect(() => {
    // Clear when switching accounts or when no record
    setAlreadyClaimed(null);
    if (!address || !pathId) return;
    const key = `claimed::${address.toLowerCase()}::${pathId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try { setAlreadyClaimed(JSON.parse(raw)); } catch { setAlreadyClaimed(null); }
    }
  }, [address, pathId]);

  // Server-side guard via Supabase: check if this address already claimed for this path
  useEffect(() => {
    const run = async () => {
      // Only enforce when we have a specific path context
      setAlreadyClaimed((prev) => prev); // no-op to keep state
      if (!address || !pathId) return;
      try {
        const { data } = await getExistingClaim(address, pathId);
        if (data) {
          setAlreadyClaimed({ tx: (data as any).tx_hash, tokenId: String((data as any).token_id), when: (data as any).created_at });
        } else {
          // No server record for this (address,path) — allow mint
          setAlreadyClaimed((prev) => prev && prev.tokenId && prev.tx ? prev : null);
        }
      } catch {}
    };
    run();
  }, [address, pathId]);

  const canMint = useMemo(
    () => Boolean(isConnected && onBase && address && CERT_ADDR && isAddress(CERT_ADDR) && eligible),
    [isConnected, onBase, address, eligible]
  );

  // Note: We now always use the official template; generic builder removed.

  async function buildPersonalizedTokenUriAsync() {
    const name = (recipientName?.trim() || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Recipient')) as string;
    const title = pathTitle || 'Certificate';
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mon = today.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const yyyy = today.getFullYear();
    const dateStr = `${dd} ${mon} ${yyyy}`;
    // Always use the official certificate template
    const resp = await fetch('/certificates/certificate_mjpt.svg');
    if (!resp.ok) throw new Error('Certificate template not found');
    let tpl = await resp.text();
    // Replace placeholders or known literals with actual values
    const certIdFallback = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'CERT-XXXX';
    // Name substitutions
    tpl = tpl.replace(/\{\{\s*NAME\s*\}\}/gi, name);
    tpl = tpl.replace(/SHAIKH\s*MINHAZ/gi, name);
    tpl = tpl.replace(/shaikhminhaz/gi, name);
    // Date substitutions
    tpl = tpl.replace(/\{\{\s*DATE\s*\}\}/gi, dateStr);
    tpl = tpl.replace(/15\s*SEP\s*2025/gi, dateStr);
    tpl = tpl.replace(/15\s*sep/gi, dateStr);
    // Certificate ID substitutions (use wallet short as on-chain fallback)
    tpl = tpl.replace(/\{\{\s*CERT_ID\s*\}\}/gi, certIdFallback);
    tpl = tpl.replace(/ADH1224VNBNJBDSS/gi, certIdFallback);
    tpl = tpl.replace(/cert\s*id/gi, certIdFallback);
    const svg = tpl;
    const image = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    const metadata = {
      name: `${title} – ${name}`,
      description: `Onchain proof that ${name} completed "${title}" on HackOSquad.`,
      image,
      external_url: 'https://sepolia.basescan.org/address/0xE1E6696320827f1ed24e509BfeF5cd790E1fe101',
      attributes: [
        { trait_type: 'Recipient', value: name },
        { trait_type: 'Certification', value: title },
        ...(pathId ? [{ trait_type: 'Path ID', value: pathId }] : []),
        { trait_type: 'Issuer', value: 'HackOSquad' },
        { trait_type: 'Network', value: 'Base Sepolia' },
        { trait_type: 'Date', value: today.toISOString().split('T')[0] },
      ],
    };
    const json = JSON.stringify(metadata);
    return `data:application/json;utf8,${encodeURIComponent(json)}` as string;
  }

  // Preview removed temporarily

  const [lastError, setLastError] = useState<string | undefined>(undefined);

  async function findMintFunction(to: `0x${string}`, uri: string): Promise<'mintTo' | 'safeMint' | 'mint'> {
    if (!publicClient || !CERT_ADDR) throw new Error('Missing client or contract');
    const candidates: Array<'mintTo' | 'safeMint' | 'mint'> = ['mintTo', 'safeMint', 'mint'];
    let lastErr: any = null;
    for (const fn of candidates) {
      try {
        await publicClient.simulateContract({ address: CERT_ADDR, abi: ABI as any, functionName: fn as any, args: [to, uri], account: to });
        return fn;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('No compatible mint function found');
  }

  const onMint = async () => {
    if (!address || !CERT_ADDR) return;
    setLastError(undefined);
    // Ensure correct network
    if (!onBase) {
      try { await switchChain({ chainId: baseSepolia.id }); } catch (e: any) {
        setLastError(e?.message || 'Failed to switch network to Base Sepolia');
        return;
      }
    }
    let uriToSend: string;
    if (usePersonalized) {
      try {
        uriToSend = await buildPersonalizedTokenUriAsync();
      } catch (e: any) {
        setLastError(e?.message || 'Failed to prepare certificate template');
        return;
      }
    } else {
      uriToSend = tokenUri;
    }
    try {
      const fn = await findMintFunction(address, uriToSend);
      await writeContractAsync({ address: CERT_ADDR, abi: ABI as any, functionName: fn as any, args: [address, uriToSend] });
    } catch (e3: any) {
      console.error('Mint failed', e3);
      const msg = e3?.shortMessage || e3?.message || '';
      // Friendlier hints for common revert reasons
      const hint = /only owner/i.test(msg)
        ? 'This contract restricts minting to the owner. Use mintTo/safeMint as owner or update permissions.'
        : /paused/i.test(msg)
        ? 'Contract appears paused; request the owner to unpause.'
        : /insufficient funds/i.test(msg)
        ? 'Insufficient gas on Base Sepolia for this wallet.'
        : /function selector was not recognized/i.test(msg)
        ? 'Contract does not support this mint signature (mintTo/safeMint/mint).' 
        : '';
      setLastError(`${msg}${hint ? ` — ${hint}` : ''}` || 'Mint failed');
    }
  };

  // After confirmation, parse Transfer event to get tokenId and resolve tokenURI
  useEffect(() => {
    const run = async () => {
      let txReceipt = receipt;
      // Fallback: if receipt is missing, try to fetch by hash (with retries)
      if (!txReceipt && txHash && publicClient) {
        for (let i = 0; i < 3; ++i) {
          try {
            txReceipt = await publicClient.getTransactionReceipt({ hash: txHash });
            if (txReceipt) break;
          } catch (e) {
            await new Promise(res => setTimeout(res, 1000 * (i + 1)));
          }
        }
      }
      if (!txReceipt || !address || !CERT_ADDR || mintedTokenId || !publicClient) return;
      try {
        const events = parseEventLogs({ abi: ABI as any, logs: txReceipt.logs }) as any[];
        const transfers = events.filter((e: any) => e.eventName === 'Transfer');
        const mintEvent = transfers.find((e: any) => e.args && e.args.from === '0x0000000000000000000000000000000000000000' && e.args.to?.toLowerCase() === address.toLowerCase());
        const tokenId: bigint | undefined = mintEvent?.args?.tokenId as bigint | undefined;
        if (tokenId !== undefined) {
          setMintedTokenId(tokenId);
          let uriString: string | undefined;
          let metaName: string | undefined;
          let metaImage: string | undefined;
          // Try to resolve tokenURI and metadata, but do not block persistence if it fails
          try {
            const uri = await publicClient.readContract({ address: CERT_ADDR, abi: ABI as any, functionName: 'tokenURI', args: [tokenId] });
            uriString = typeof uri === 'string' ? uri : undefined;
            setResolvedTokenUri(uriString as string);
            if (typeof uriString === 'string' && uriString.startsWith('data:application/json')) {
              const [, payload] = uriString.split(',', 2);
              const json = decodeURIComponent(payload);
              try {
                const meta = JSON.parse(json);
                setResolvedMetadata(meta);
                metaName = meta?.name;
                metaImage = meta?.image;
              } catch {}
            }
          } catch {}

          // Resolve block time for nicer display (best-effort)
          try {
            const blk = await publicClient.getBlock({ blockNumber: txReceipt.blockNumber! });
            const ts = Number(blk.timestamp) * 1000;
            setTxTimeIso(new Date(ts).toISOString());
          } catch {}

          // Mark claimed in localStorage for this address+pathId (best-effort)
          if (pathId) {
            const key = `claimed::${address.toLowerCase()}::${pathId}`;
            const record = { tx: txHash as string | undefined, tokenId: tokenId.toString(), when: new Date().toISOString() };
            try { localStorage.setItem(key, JSON.stringify(record)); setAlreadyClaimed(record); } catch {}
          }

          // Persist claim in Supabase (always attempt, even if tokenURI failed)
          try {
            await saveClaim({
              user_id: user?.id,
              address: address.toLowerCase(),
              path_id: pathId,
              token_id: tokenId.toString(),
              tx_hash: String(txHash || txReceipt.transactionHash),
              token_uri: uriString,
              metadata_name: metaName || (resolvedMetadata?.name as string) || undefined,
              metadata_image: metaImage || (resolvedMetadata?.image as string) || undefined,
              // extras
              // @ts-ignore
              chain_id: (typeof chainId === 'number' ? chainId : undefined) as any,
              contract_address: CERT_ADDR,
            });
          } catch {}
        }
      } catch {}
    };
    run();
  }, [receipt, address, CERT_ADDR, mintedTokenId, publicClient, txHash]);

  return (
    <div className="p-6">
      <div className="card p-6 glass-effect">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Claim Your Certificate</h1>
            <p className="text-gray-300 mt-2 max-w-xl">Receive an official digital certificate for completing this course. It will be saved to your wallet and can be verified by anyone.</p>
            <div className="mt-3 p-3 rounded bg-slate-800 border border-slate-700 text-sm text-gray-200">What this does — Issue a permanent, verifiable certificate on Base Sepolia for completed courses.</div>
          </div>
          <div className="text-right">
            <ConnectWallet />
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-sm text-gray-400">Certificate System Address</div>
            <div className="font-mono text-sm text-white/80 break-all">{CERT_ADDR || 'Not set'}</div>

            {!onBase && (
              <div className="mt-3 p-3 rounded border border-amber-400/20 bg-amber-900/5 text-amber-300">
                You are on the wrong network. Please switch to Base Sepolia (test network).
                <div className="mt-2">
                  <button onClick={() => switchChain({ chainId: baseSepolia.id })} disabled={isSwitching} className="btn btn-outline">
                    {isSwitching ? 'Switching…' : 'Switch to Base Sepolia'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="form-label">Your name</label>
              <input className="form-input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Your full name" />
            </div>

            <div>
              <label className="form-label">Certificate title</label>
              <input className="form-input" value={pathTitle || ''} onChange={(e) => setPathTitle(e.target.value)} placeholder="e.g., Junior Penetration Tester" />
            </div>

            <div className="text-xs text-gray-400">Your certificate will include your name and the course title. After claiming, you can download or share it.</div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded border border-slate-700 bg-slate-900">
              <div className="text-sm text-gray-400">Eligibility</div>
              <div className="text-lg font-medium text-white">{checking ? 'Checking…' : eligible ? 'You are eligible' : 'Not eligible yet'}</div>
            </div>

            {alreadyClaimed ? (
              <div className="p-4 rounded border border-green-600 bg-green-900/5">
                <div className="text-lg font-semibold text-green-200">Certificate already issued</div>
                <div className="text-sm text-gray-200 mt-1">Your completion is already recorded on the blockchain and linked to your wallet.</div>
                {alreadyClaimed?.tx && (
                  <div className="mt-2 text-sm">
                    Transaction: <a className="underline text-green-100" href={explorerTxUrl(alreadyClaimed.tx as string)} target="_blank" rel="noreferrer">{short(alreadyClaimed.tx)}</a>
                  </div>
                )}
                <div className="mt-3 text-xs text-gray-400">To download or share, go to <a className="underline" href="/certs/mine">Your Certificates</a>.</div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={onMint} disabled={!canMint || isPending || waiting} className="btn btn-primary">
                  {isPending || waiting ? 'Claiming…' : 'Claim Certificate'}
                </button>
                <button onClick={() => setRecipientName((r) => r || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''))} className="btn btn-outline">
                  Use wallet name
                </button>
              </div>
            )}

            {txHash && (
              <div className="text-sm text-gray-400">Transaction: <a className="underline text-red-300" href={explorerTxUrl(txHash as string)} target="_blank" rel="noreferrer">{short(txHash)}</a></div>
            )}

            {mintedTokenId !== undefined && (
              <div className="p-3 rounded border border-slate-700 bg-slate-900">
                <div className="text-sm text-gray-400">Certificate ID</div>
                <div className="font-mono text-white">{mintedTokenId!.toString()}</div>
                <div className="mt-2 text-xs text-gray-400">View on explorer: <a className="underline text-red-300" href={`${EXPLORER_BASE}/token/${CERT_ADDR}?a=${mintedTokenId!.toString()}`} target="_blank" rel="noreferrer">BaseScan</a></div>
              </div>
            )}

            {(error || lastError) && <div className="text-sm text-rose-400">{(lastError as any) || (error as any)?.message || String(error)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
