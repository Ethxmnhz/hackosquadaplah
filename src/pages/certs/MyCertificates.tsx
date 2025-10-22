import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import ConnectWallet from '../../components/onchain/ConnectWallet';
import { EXPLORER_BASE } from '../../onchain/wagmi';
import { getClaimsByAddress, OnchainClaim } from '../../lib/claims';

export default function MyCertificates() {
  const { address, isConnected } = useAccount();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OnchainClaim[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [version, setVersion] = useState(0);

  const canQuery = useMemo(() => Boolean(isConnected && address), [isConnected, address]);

  useEffect(() => {
    const run = async () => {
      if (!canQuery || !address) return;
      setLoading(true);
      setError(undefined);
      try {
        const { data, error } = await getClaimsByAddress(address);
        if (error) throw error;
        setItems((data || []) as OnchainClaim[]);
      } catch (e: any) {
        setError(e?.message || 'Failed to load certificates');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [address, canQuery, version]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-white">Your Certificates</h1>
      <p className="text-gray-300">These are your digital certificates for completed courses. You can view, download, or share them anytime.</p>
      <p className="text-sm text-gray-400">All certificates are securely stored and can be verified by anyone. Powered by blockchain for extra trust.</p>
      <ConnectWallet />
      <div className="flex items-center gap-3 text-sm">
        <button
          className="px-3 py-1.5 rounded-lg border border-red-500/40 hover:border-red-400 text-white/90"
          onClick={() => setVersion((v) => v + 1)}
        >
          Refresh List
        </button>
        <span className="text-xs text-gray-400">Certificates are always available here, even if the blockchain is busy.</span>
      </div>

      {loading && <div className="text-sm text-gray-400">Loading your certificates…</div>}
      {error && (
        <div className="text-sm text-rose-400">
          {error}
          {/permission denied|rls|forbidden|403/i.test(error) && (
            <div className="mt-1 text-xs text-gray-400">
              Tip: Please contact support if you have trouble viewing your certificates.
            </div>
          )}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-400">No certificates found for this wallet yet. Claim a certificate to see it here.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <ClaimCard key={`${it.tx_hash}-${it.token_id}`} claim={it} />
        ))}
      </div>
    </div>
  );
}

function short(s?: string, head = 6, tail = 4) {
  if (!s) return '';
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function chainName(chain?: number) {
  if (!chain) return 'Base (Testnet)';
  if (chain === 84532) return 'Base Sepolia';
  if (chain === 8453) return 'Base';
  return `Chain ${chain}`;
}

async function buildExportSvgFromTemplate(c: OnchainClaim) {
  // Load the official template and replace with claim data
  const resp = await fetch('/certificates/certificate_mjpt.svg');
  if (!resp.ok) throw new Error('Certificate template not found');
  let tpl = await resp.text();
  // Derive recipient name from metadata_name if possible (Title – Name)
  let recipient = c.metadata_name || '';
  const splitIdx = recipient.indexOf('–');
  if (splitIdx >= 0) recipient = recipient.slice(splitIdx + 1).trim();
  if (!recipient) recipient = c.address;
  const d = c.created_at ? new Date(c.created_at) : new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const yyyy = d.getFullYear();
  const dateStr = `${dd} ${mon} ${yyyy}`;
  const certId = c.tx_hash; // full tx hash as requested
  // Perform replacements
  tpl = tpl.replace(/\{\{\s*NAME\s*\}\}/gi, recipient);
  tpl = tpl.replace(/SHAIKH\s*MINHAZ/gi, recipient);
  tpl = tpl.replace(/shaikhminhaz/gi, recipient);
  tpl = tpl.replace(/\{\{\s*DATE\s*\}\}/gi, dateStr);
  tpl = tpl.replace(/15\s*SEP\s*2025/gi, dateStr);
  tpl = tpl.replace(/15\s*sep/gi, dateStr);
  tpl = tpl.replace(/\{\{\s*CERT_ID\s*\}\}/gi, certId);
  tpl = tpl.replace(/ADH1224VNBNJBDSS/gi, certId);
  tpl = tpl.replace(/cert\s*id/gi, certId);
  return tpl;
}

async function downloadCertificate(c: OnchainClaim) {
  let svg: string;
  try {
    svg = await buildExportSvgFromTemplate(c);
  } catch {
    // As a last resort, embed the metadata image if present
    const imageHref = c.metadata_image || '';
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>${imageHref ? `<image href='${imageHref}' x='0' y='0' width='1200' height='800'/>` : ''}</svg>`;
    svg = fallback;
  }
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (c.metadata_name || 'certificate').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 64);
  a.download = `${safeName}_${short(c.tx_hash)}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ClaimCard({ claim }: { claim: OnchainClaim }) {
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const svg = await buildExportSvgFromTemplate(claim);
        if (!ok) return;
        const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        setPreviewSrc(dataUri);
      } catch {
        setPreviewSrc(claim.metadata_image); // fallback to stored image if template missing
      }
    })();
    return () => { ok = false; };
  }, [claim]);

  return (
    <div className="p-3 border border-red-500/20 rounded-xl bg-[#0A030F]">
      <div className="text-xs text-gray-400">Certificate ID</div>
      <div className="text-sm font-mono text-white">{String(claim.token_id)}</div>
      {claim.metadata_name && <div className="mt-1 text-sm text-gray-200">{claim.metadata_name}</div>}
      {previewSrc && <img src={previewSrc} alt="certificate" className="mt-2 rounded max-h-40" />}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300">
        <div>Transaction</div>
        <div className="font-mono break-all">{short(claim.tx_hash, 10, 10)}</div>
        <div>Wallet</div>
        <div className="font-mono break-all">{short(claim.address, 10, 6)}</div>
        <div>Date</div>
        <div>{(claim.created_at || '').replace('T', ' ').replace('Z', '')}</div>
        <div>Network</div>
        <div>{chainName(claim.chain_id)}</div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <a className="text-red-300 underline" href={`${EXPLORER_BASE}/tx/${claim.tx_hash}`} target="_blank" rel="noreferrer">View on Blockchain</a>
        <button className="px-2 py-1 rounded border border-rose-400/40 hover:border-rose-300 text-rose-200" onClick={() => downloadCertificate(claim)}>Download Certificate</button>
      </div>
    </div>
  );
}
