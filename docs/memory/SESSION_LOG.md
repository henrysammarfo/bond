# Session log

## 2026-09-27 — Neon + CDP + Judr intel

### Live wiring
- Neon `aged-flower-56535737`: `NEON_API_KEY` → pooled `DATABASE_URL` → **`bun run db:push` OK** (quote URL; unquoted `&` breaks Bun env parse).
- CDP API key JSON loaded (`CDP_API_KEY_ID` / `CDP_API_KEY_SECRET`). **`CDP_WALLET_SECRET` still missing** — generate at [portal non-custodial security](https://portal.cdp.coinbase.com/wallets/non-custodial/security), then `bun run cdp:export` (or import interim key).
- Interim Avalanche signer (gitignored `.env.local`): **`0x1eFBb041E94aCc18D50C578eD34c265075d3b14e`** — balances **0 AVAX / 0 USDC**. Fund ≥100 USDC + AVAX: https://snowscan.xyz/address/0x1eFBb041E94aCc18D50C578eD34c265075d3b14e
- AgentRouter Tor + SERV mandate previously green; TinyFish/Tavily/IXS OK.

### Competitor
- **Judr** ([tryjudr.vercel.app](https://tryjudr.vercel.app/)) — arbitration + live Base payout + standing Avalanche 100 USDC IXS position. Notes in `COMPETITORS.md`. BOND must not copy UX; must beat on RWA Vaults mandate→Pending→shares proof.

### Blockers to win
1. Fund wallet `0x1eFBb041…b14e` with ≥100 USDC + AVAX.
2. Optional: paste `CDP_WALLET_SECRET` and re-export/import so portal matches funded address.
3. Live `requestDeposit` + Pending screenshot + public demo URL + X/@openservai before **28 Sep 2026 00:00 UTC**.
