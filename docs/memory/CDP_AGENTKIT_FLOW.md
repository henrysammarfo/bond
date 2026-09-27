# CDP / AgentKit Avalanche wallet — exact flow

BOND signs IXS deposit txs with `AGENT_PRIVATE_KEY` (EVM key from a Coinbase CDP / AgentKit wallet on **Avalanche C-Chain**). Do this once, put secrets in `.env.local` / hosting env — **never git**.

## A. Create CDP project + API keys

1. Open [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) → sign in.
2. Create / select a project for BOND.
3. **API Keys** → Create API key  
   - Save **API Key ID** → `CDP_API_KEY_ID`  
   - Save **API Key Secret** → `CDP_API_KEY_SECRET`  
4. If the portal shows a **Wallet Secret** for Server Wallets / AgentKit v2 → `CDP_WALLET_SECRET`.

Official docs: [CDP Portal](https://portal.cdp.coinbase.com) · [AgentKit TS](https://github.com/coinbase/agentkit/blob/main/typescript/agentkit/README.md)

## B. Create an Avalanche wallet (pick one path)

### Path 1 — CDP Server Wallet (recommended for AgentKit)

1. In CDP Portal → **Wallets** / **Server Wallets**.
2. Create wallet with network **`avalanche-mainnet`** (C-Chain).  
   If the UI only lists Base first, set network in code/env to `avalanche-mainnet` when configuring `CdpEvmWalletProvider`.
3. Copy the wallet **address** → `CDP_WALLET_ADDRESS`.
4. **Export private key** for that wallet (portal “Export” / CDP SDK `exportWallet`).  
   - Put the hex key in `AGENT_PRIVATE_KEY` (with or without `0x`).  
   - Optional duplicate: `CDP_WALLET_PRIVATE_KEY` (same value).

Minimal Node export sketch (run locally, never commit output):

```ts
import { CdpClient } from "@coinbase/cdp-sdk";
// Follow current CDP docs for v2 wallet export for your account.
// Goal: one Avalanche EVM private key + address in env.
```

### Path 2 — Local AgentKit configure + export

From AgentKit README (`CdpEvmWalletProvider`):

```ts
import { CdpEvmWalletProvider } from "@coinbase/agentkit";

const wallet = await CdpEvmWalletProvider.configureWithWallet({
  apiKeyId: process.env.CDP_API_KEY_ID!,
  apiKeySecret: process.env.CDP_API_KEY_SECRET!,
  walletSecret: process.env.CDP_WALLET_SECRET!,
  networkId: "avalanche-mainnet",
  idempotencyKey: "bond-avalanche-primary",
});

console.log("address", await wallet.getAddress());
console.log("export", await wallet.exportWallet()); // keep offline → AGENT_PRIVATE_KEY
```

BOND’s runtime signer (`src/backend/agentkit/wallet.ts`) uses **viem + `AGENT_PRIVATE_KEY`** so Cloudflare builds stay clean; the key must still come from this CDP/AgentKit wallet.

## C. Fund the wallet (required to win RWA track)

| Asset | Why | How |
| --- | --- | --- |
| **≥ 100 USDC** on Avalanche | IXS minimum deposit | Send Avalanche USDC `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` to `CDP_WALLET_ADDRESS` |
| **AVAX** | Gas for approve + requestDeposit (+ claim) | Bridge/buy AVAX on C-Chain → same address |

Check: [snowscan.xyz](https://snowscan.xyz/address/YOUR_ADDRESS)

No testnet for this track. No mock deposit.

## D. Env checklist

```bash
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...          # if portal issued one
CDP_WALLET_ADDRESS=0x...
AGENT_PRIVATE_KEY=0x...        # exported EVM key — REQUIRED for BOND signing
CDP_IDEMPOTENCY_KEY=bond-avalanche-primary
```

## E. Verify before live subscribe

```bash
# App must print the same address as CDP portal
bun run dev
# open /login → register → /dashboard/wallet
```

Wallet page reads live AVAX + USDC via Avalanche RPC. If balances show and address matches portal, signing is ready.

Then: create Avalanche mandate → open primary vault → **Confirm live deposit** → UI **Pending (not earning)** until IXS shares.

## Security

- Never paste `AGENT_PRIVATE_KEY` into chat, screenshots, or git.
- Prefer hosting secret stores (Lovable / Vercel / Cloudflare).
- Rotate CDP keys after the hackathon.
