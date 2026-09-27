# Session log


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
