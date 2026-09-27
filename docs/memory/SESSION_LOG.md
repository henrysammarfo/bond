# Session log

## 2026-09-27 — Security clarity + market readiness

### Keys
- Secrets remain in gitignored `.env.local` only (verified not tracked).
- Added `SECURITY.md`: backup `AGENT_PRIVATE_KEY` to reclaim USDC; rotate chat-pasted keys after hack.
- CDP Wallet Secret wired; signer `0x1eFBb041E94aCc18D50C578eD34c265075d3b14e` still **unfunded** on-chain last check.

### Ready vs not ready for “market”
- **Ready:** public marketing pages, org register/login, mandates, live vault browse, Pending honesty UI, Snowscan proof surface, Neon DB.
- **Not ready as self-serve DeFi:** per-user wallet connect, per-user deposits, full redeem UX in dashboard, public hosting env with all secrets, live deposit evidence.

### Next (win path)
1. Fund signer ≥100 USDC + AVAX  
2. Demo: register → mandate → Confirm live deposit → Pending + Snowscan  
3. Deploy public URL with secrets  
4. Fill WIN_CHECKLIST + X/@openservai  
5. Later: redeem same key → USDC back (async IXS)
