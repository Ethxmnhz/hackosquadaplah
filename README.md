# HackOSquad – Onchain Proof-of-Completion (Base Sepolia)

This app mints a Proof-of-Completion NFT (ERC‑721) on Base Sepolia when a user completes a skill path.

- Contract (Base Sepolia): `0xE1E6696320827f1ed24e509BfeF5cd790E1fe101`
- Example Mint Tx: https://sepolia.basescan.org/tx/0x929845a7687f0b312345ac366ad03614e1d3b06c605e7b15c78da701ac7b0ed7

## Run locally

Windows PowerShell:

```powershell
cd K:\project\project-final\project-final
npm install
npm run dev
```

Open the URL printed by Vite (e.g., http://localhost:5173).

## Claim a certificate (test flow)

1) Connect your wallet (Coinbase Wallet or injected).
2) Ensure your wallet is on Base Sepolia. If not, click "Switch to Base Sepolia" on the page.
3) Open `/certs/claim?pathId=YOUR_PATH_ID&title=Your+Skill+Path+Name` with a pathId where your user completion status is `completed`.
4) Click "Mint Certificate" and approve. A Basescan link will appear; after confirmation, the page shows the block number.

Default token metadata: `/certificates/sample.json` (in `public/`). Replace with IPFS if desired.

## Environment

Create `.env` in `project-final/project-final/` with:

```
VITE_CERT_NFT_ADDRESS=0xE1E6696320827f1ed24e509BfeF5cd790E1fe101
```

Restart the dev server after editing `.env`.

## Notes

- Network: Base Sepolia (chainId 84532). RPC https://sepolia.base.org, Explorer https://sepolia.basescan.org.
- The Claim page first tries `mintTo(address,string)`, then falls back to `safeMint(address,string)`.
- Eligibility is gated client-side by checking your skill path progress; for production, add a signed claim or server check.
