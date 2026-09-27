# Security & fund recovery (operator)

See also: [`TECHNICAL_DEEP_DIVE.md`](./TECHNICAL_DEEP_DIVE.md) (bugs, WAF/Tor, CDP scopes, Bun `&` env quirk, SERV `approved` vs `allow`).

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

**Multitenant RWA treasury app — per-org AgentKit, BYO integrations.**

| Users can | Users cannot (yet) |
| --- | --- |
| Register org, login, logout (httpOnly) | Browser MetaMask “connect wallet” UX |
| Own AgentKit Avalanche address (generated or imported) | Instant refund (redeem is async IXS) |
| Connect own SERV / AgentRouter keys in Settings | |
| Use platform fallback keys for demo | |
| Create mandates, live vault browse, deposit with funding check | |
| See Pending / shares / Snowscan proofs | |

Platform covers fair judge demo. BYO keys = run on your credentials. See `TECHNICAL_DEEP_DIVE.md`.

## After the demo deposit

1. Keep the key backup.  
2. When shares finalize → redeem via IXS MCP (`vault_build_request_redeem` → status → `vault_build_claim_redeem`) signed by the same key.  
3. Rotate chat-exposed API keys.  
4. Move secrets to Lovable/Vercel/hosting secret store for the public URL.
