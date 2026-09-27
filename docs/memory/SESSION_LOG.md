# Session log


## 2026-09-27 — Vercel production live

### Shipped
- Linked Vercel project `teamtitanlink/bond` → GitHub `henrysammarfo/bond`
- Production env synced (25 secrets); `AGENTROUTER_USE_TOR=0` on Vercel (no SOCKS — OpenServ is primary SERV path)
- SSO deployment protection disabled for public judging
- **Production URL:** https://bond-pi.vercel.app (`/`, `/vaults`, `/evidence`, `/login` → 200)

### Still needed for live win
1. **Fund** platform AgentKit `0x1eFBb041E94aCc18D50C578eD34c265075d3b14e` with **≥104 USDC** (`0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`) + **AVAX gas** (wallet currently 0/0)
2. Register → Scan → Subscribe → capture Pending + Snowscan txs → fill WIN_CHECKLIST
3. X post + @openservai + OpenServ form before **28 Sep 2026 00:00 UTC**
4. **Rotate** chat-pasted secrets (Vercel token, Neon, CDP, OpenServ, AgentRouter, etc.) after submission

### Notes
- AgentRouter failover on Vercel may hit Aliyun WAF without Tor; OpenServ path must stay healthy
- Do not commit `.env.local` / Vercel token


## 2026-09-27 — Preflight + evidence (beat simulated-only allocators)

### Shipped
- Deterministic IXS preflight: status, whitelist, NAV/`maxDeposit`, MCP build, **$104** redeemable floor, **25% TVL** cap
- SERV multi-vault ALLOCATE/DEFER/REJECT scan (`/dashboard/scan`) + public `/evidence`
- eth_call deposit simulation (no broadcast)
- Live subscribe hard-requires preflight ALLOCATE + redeemable floor
- BSC USDC 18-decimal fix for balances / deposits

### Differentiation (product, not name-calling)
BOND still does **live AgentKit deposits** with Pending honesty. Simulated-only desks stop at eth_call — we publish the same class of facts and then sign when funded.



## 2026-09-27 — Launch scrub · dual-chain · folio README

### Shipped
- Removed competitor notes and every former scaffold/product/config trace (native TanStack Vite + Nitro)
- Avalanche **and** BNB IXS permissionless lanes in UI + mandates + wallet balances + SERV prompt
- Folio-style human README with mermaid diagrams
- Website launch pass: privacy/terms, cookies, SEO/og/favicon, sitemap/robots, HTTPS headers, 404, form validation + honeypot, analytics beacon, single CTA, alt text, contrast

### Still needed for live win
1. Fund an org agent address ≥100 USDC + gas (Avalanche and/or BNB)
2. Confirm live deposit → Pending + explorer
3. Public host env 24/7
4. WIN_CHECKLIST + X/@openservai


## 2026-09-27 — All-around app: per-org integrations vault

### Shipped
- `org_integrations` table + AES-256-GCM secret box (`SESSION_SECRET` / `INTEGRATIONS_ENCRYPTION_KEY`)
- Register provisions unique AgentKit address; Settings → Integrations BYO SERV / AgentRouter / import|rotate agent key + platform fallback
- Mandate + deposit paths resolve org secrets; `assertDepositFunding` fails closed on insufficient USDC/AVAX
- `TECHNICAL_DEEP_DIVE.md` — WAF/Tor, Bun `&` env bug, CDP export scope, SERV `approved`, dual-chain IXS, etc.
- Tests expanded; `bun run smoke:stack` = tests + Tor smoke + build

### Product honesty
- Not MetaMask browser-wallet connect — **per-org custodial AgentKit key** (generate or import). Users fund *their* org address.
- Judges can try with platform fallback or paste their own SERV key.

### Still needed for live win
1. Fund an org agent address ≥100 USDC + AVAX  
2. Confirm live deposit → Pending + Snowscan  
3. Public host env (DB + encryption + LLM path) 24/7  
4. WIN_CHECKLIST + X/@openservai
