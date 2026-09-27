# CDP / AgentKit Avalanche wallet — exact flow for BOND

BOND signs IXS deposit txs with `AGENT_PRIVATE_KEY` (EVM hex key from a Coinbase CDP **API Key Wallet**). Same key works on Avalanche C-Chain (chainId `43114`) because CDP EVM accounts are address-level, not chain-locked.

Official refs: [CDP Portal](https://portal.cdp.coinbase.com) · [API keys](https://docs.cdp.coinbase.com/get-started/docs/cdp-api-keys) · [Server Wallet quickstart](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart) · [Import & export](https://docs.cdp.coinbase.com/wallets/using-wallets/import-and-export) · [AgentKit](https://github.com/coinbase/agentkit/blob/main/typescript/agentkit/README.md)

**Never commit keys. Never paste `AGENT_PRIVATE_KEY` into chat/screenshots.**

---

## Step 1 — Open CDP Portal and create a project

1. Go to **[portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)** and sign in (Coinbase account).
2. Create a project (or select an existing one) named e.g. `BOND`.
3. Stay on that project for all steps below (project switcher top of portal).

---

## Step 2 — Create a Secret API Key (with Export scope)

1. Open **[portal.cdp.coinbase.com/projects/api-keys](https://portal.cdp.coinbase.com/projects/api-keys)** (API Keys dashboard).
2. Select tab **Secret API Keys**.
3. Click **Create API key** → name it `bond-server`.
4. Under API restrictions / API-specific restrictions, enable:
   - Wallet / account create & manage
   - **Export (export private key)** — required for `cdp.evm.exportAccount`
5. Prefer Ed25519 signature algorithm.
6. Click **Create**.
7. Copy immediately into `.env.local` (shown once):

```bash
CDP_API_KEY_ID=<key id from modal>
CDP_API_KEY_SECRET=<secret from modal>
```

Optional: download the JSON key file offline; do not commit it.

---

## Step 3 — Generate a Wallet Secret (required — not inside the API key JSON)

The downloaded `cdp_api_key.json` only has `id` + `privateKey`. **Wallet Secret is a separate file.**

1. Open **[portal.cdp.coinbase.com/wallets/non-custodial/security](https://portal.cdp.coinbase.com/wallets/non-custodial/security)**  
   (or Portal → Non-custodial Wallet → **Security** → **Generate Wallet Secret**).
2. Download / copy the secret (shown once).
3. Put in `.env.local`:

```bash
CDP_WALLET_SECRET=<wallet secret>
```

Without this, `bun run cdp:export` fails with: `Wallet Secret not configured`.

Docs: [Server Wallet quickstart](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart) · [CDP CLI agents](https://docs.cdp.coinbase.com/get-started/build-with-ai/cdp-for-agents)

### Interim (if Wallet Secret is delayed)

A local EVM key can sign Avalanche deposits (`AGENT_PRIVATE_KEY`) so funding can start. Prefer importing that key into CDP later via `cdp.evm.importAccount` once `CDP_WALLET_SECRET` exists, so the portal address matches the funded address.

---

## Step 4 — Create the BOND Avalanche signer account + export key

Run from the repo (uses `@coinbase/cdp-sdk`; prints address + writes keys only to stdout — copy by hand into `.env.local`):

```bash
# .env.local must already have CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
bun run cdp:export
```

What the script does:

1. `cdp.evm.getOrCreateAccount({ name: "bond-avalanche-primary" })` — stable named account.
2. Prints `CDP_WALLET_ADDRESS=0x…`
3. `cdp.evm.exportAccount({ name: "bond-avalanche-primary" })` — returns 32-byte hex **without** `0x`.
4. Prints `AGENT_PRIVATE_KEY=0x…` and `CDP_WALLET_PRIVATE_KEY=0x…` (same value).

Then paste those three lines into `.env.local` / Lovable / hosting secrets.

Equivalent one-liner if you prefer CDP CLI:

```bash
npx @coinbase/cdp-cli env live --key-file ./cdp_api_key.json
npx @coinbase/cdp-cli env live --wallet-secret-file ./cdp_wallet_secret.txt
npx @coinbase/cdp-cli evm accounts create name=bond-avalanche-primary
# then export via bun run cdp:export (or SDK exportAccount)
```

### Why Avalanche works with a “generic” EVM account

CDP EVM accounts are secp256k1 addresses. BOND’s runtime (`src/backend/agentkit/wallet.ts`) signs on `viem` chain `avalanche` (43114). You fund **that same address** on Avalanche C-Chain — no separate “Avalanche-only” CDP wallet type is required.

AgentKit alternative (same keys):

```ts
import { CdpEvmWalletProvider } from "@coinbase/agentkit";

const wallet = await CdpEvmWalletProvider.configureWithWallet({
  apiKeyId: process.env.CDP_API_KEY_ID!,
  apiKeySecret: process.env.CDP_API_KEY_SECRET!,
  walletSecret: process.env.CDP_WALLET_SECRET!,
  networkId: "avalanche-mainnet",
  idempotencyKey: "bond-avalanche-primary",
});
```

BOND does **not** ship AgentKit in the Cloudflare build; we only need the exported private key.

---

## Step 5 — Fund the address on Avalanche mainnet

| Asset | Amount | Contract / note |
| --- | --- | --- |
| **USDC** | **≥ 100** | Avalanche USDC `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| **AVAX** | enough for gas | approve + `requestDeposit` (+ later claim) |

Send to `CDP_WALLET_ADDRESS`. Confirm on [snowscan.xyz/address/YOUR_ADDRESS](https://snowscan.xyz).

No public testnet for this OpenServ RWA track. No mock deposit.

---

## Step 6 — Env checklist (final)

```bash
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...
CDP_WALLET_ADDRESS=0x...
AGENT_PRIVATE_KEY=0x...          # REQUIRED — from bun run cdp:export
CDP_WALLET_PRIVATE_KEY=0x...     # optional duplicate of AGENT_PRIVATE_KEY
CDP_IDEMPOTENCY_KEY=bond-avalanche-primary
```

---

## Step 7 — Verify in the product

```bash
bun run db:push   # needs DATABASE_URL
bun run dev
# /login → register → /dashboard/wallet
```

Wallet page must show the same address as CDP + live AVAX/USDC balances. Then:

1. Create Avalanche USDC mandate ≥ $100  
2. Open primary vault `6a952729732c2b84b55ce89d`  
3. **Confirm live deposit** → UI **Pending (not earning)** until IXS shares  

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Export 403 / forbidden | Recreate Secret API key with **Export** scope |
| Missing wallet secret | Generate Wallet Secret in portal; set `CDP_WALLET_SECRET` |
| Address mismatch in app | `CDP_WALLET_ADDRESS` must equal `privateKeyToAccount(AGENT_PRIVATE_KEY).address` |
| USDC balance 0 | Wrong chain or wrong USDC contract — use Avalanche native USDC above |
| Cloudflare build / AgentKit | Do not add `@coinbase/agentkit` to the app runtime; keep viem + exported key |

## Security

- Rotate CDP keys + Wallet Secret after the hackathon.
- Prefer hosting secret stores over long-lived local files.
- Clear terminal scrollback after `bun run cdp:export` if shared screen.
