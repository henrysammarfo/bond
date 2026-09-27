# Security & fund recovery (operator)

## Secrets status

| Item | Status |
| --- | --- |
| `.env.local` | **Gitignored** (`.env.*`) — never committed |
| API keys / Wallet Secret / `AGENT_PRIVATE_KEY` | Live only in local secrets + hosting env |
| Public address in docs | OK to publish (`0x1eFBb041…`) — it is not the key |
| Keys pasted in chat | **Rotate after hackathon** (Neon, CDP, OpenServ, AgentRouter, Tavily, TinyFish) |

## Do not lose the $100 USDC

- Deposits and redeems are signed by **`AGENT_PRIVATE_KEY`** for address `0x1eFBb041E94aCc18D50C578eD34c265075d3b14e`.
- If that private key is lost, **funds in the vault / wallet cannot be recovered** by BOND support — there is no password reset for an EVM key.
- Back up `AGENT_PRIVATE_KEY` + `CDP_WALLET_SECRET` offline (password manager / encrypted note). Not in git, Slack, or screenshots.
- Redeem is **async** (IXS `requestRedeem` → wait → `claimRedeem`). Keep AVAX for gas on the same address. Withdraw does not “eat” principal by design; wrong key or failed claim leaves USDC in the vault/request until claimed.

## What BOND is (honest product mode)

**Hackathon / treasury-agent demo — not a self-custody marketplace.**

| Users can | Users cannot (yet) |
| --- | --- |
| Register org, login (httpOnly session) | Connect MetaMask / their own wallet |
| Create mandates, browse live IXS vaults | Deposit **their** USDC from a personal wallet |
| Trigger AgentKit deposit (shared treasury key) | Per-tenant AgentKit wallets |
| See Pending / shares / Snowscan proofs | Instant refund; redeem UI is deposit-first (MCP redeem exists on IXS) |

All orgs share one Avalanche AgentKit signer. That is correct for OpenServ RWA + AgentKit proof; it is **not** “sign up and bring your own funds.”

## After the demo deposit

1. Keep the key backup.  
2. When shares finalize → redeem via IXS MCP (`vault_build_request_redeem` → status → `vault_build_claim_redeem`) signed by the same key.  
3. Rotate chat-exposed API keys.  
4. Move secrets to Lovable/Vercel/hosting secret store for the public URL.
