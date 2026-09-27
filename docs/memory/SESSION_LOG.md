# Session log

## 2026-09-27 — Wallet Secret + Judr gaps

### CDP
- `CDP_WALLET_SECRET` wired (gitignored).
- Named account created: `bond-avalanche-primary` → `0x906a7ddC43671ef4a887553Da5A219996848Db6E`
- Interim key **imported** as `bond-avalanche-funded` → **`0x1eFBb041E94aCc18D50C578eD34c265075d3b14e`** (signer for deposits)
- `accounts#export` scope missing on Secret API key — keep local `AGENT_PRIVATE_KEY`; re-enable Export in portal if needed.
- **Balances still 0** on both addresses at last check. Fund the **funded** address:
  https://snowscan.xyz/address/0x1eFBb041E94aCc18D50C578eD34c265075d3b14e
  (≥100 Avalanche USDC + AVAX)

### Product (vs Judr)
- Subscription detail: Snowscan approve/requestDeposit links, SERV source/reason, Pending banner
- Wallet meta: removed “simulated”; live fund CTA
- Mandate/vault copy: SERV deny messaging
- Docs: `COMPETITORS.md` win posture table

### Neon
- Schema pushed earlier; auth smoke org exists.

### Next
1. On-chain funding lands → Confirm live deposit → fill WIN_CHECKLIST hashes
2. Public demo URL + X/@openservai
3. Optional: enable Export scope on CDP API key
