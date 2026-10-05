# Session log


## 2026-10-05 — Redeem + withdraw in BOND

### Shipped
- IXS MCP `vault_build_request_redeem` / `vault_build_claim_redeem` wired
- Server fns: `requestRedeemFn`, `claimRedeemFn`, `withdrawUsdcFn` (AgentKit signs; Zod address; org session)
- Subscription detail UI: Request redeem → Refresh → Claim redeem → Withdraw to EVM address
- Live position normalize (`shares`/`maxRedeem` nested IXS payloads); statuses `RedeemPending` / `RedeemClaimable` / `Withdrawn`
- Note: BNB IXHYB `maxRedeem=0` until async cycle; historical settles often ~1–2 days after request

### Operator
Log into production → open the BNB subscription → Request redeem. After IXS settles, claim if needed, paste destination, Withdraw.

### Shipped
- `evidence_entries` + `evidence_meta` tables; store writes/reads via Drizzle
- Public `/evidence` survives Vercel cold starts; still redacts wallets/secrets
- **Tor relay cannot run on Neon** (Postgres only — no SOCKS/Tor process). Keep Cloudflare tunnel / Cloud Run `Dockerfile.relay`

### Note
Evidence soft-fails on DB write so subscribe/scan remain primary paths.


## 2026-09-27 — Pre-merge audit + harden

### Fixed
- Platform AgentKit preferred on register (fund one wallet for demo); address/key mismatch assert
- `LIVE_DEPOSIT=1` gate on subscribe; enabled on Vercel
- $104 messaging aligned (policy/SERV/UI/README/public vault min)
- BSC USDC `usdcToBaseUnits` via integer cents (no 18-dec float loss)
- Overview USDC sums Avalanche + BNB; evidence public ring redacts wallets; contact form honest (no fake SMTP)
- Vercel security headers (`vercel.json`); absolute sitemap; login `next` open-redirect guard; relay `timingSafeEqual`
- Package name `bond`; `.env.example` relay vars

### Accepted residual (documented)
- Evidence still in-memory / per-instance on serverless
- Quick Tunnel relay ephemeral until Cloud Run
- Mandate usedCents race / subscribe idempotency not fully locked


## 2026-09-27 — AgentRouter Tor on Vercel (HTTPS relay)

### Shipped
- `AGENTROUTER_RELAY_URL` + `AGENTROUTER_RELAY_SECRET` client path in `agentrouter.ts` (serverless-safe)
- `scripts/agentrouter-relay.ts` — authenticated HTTPS → Tor SOCKS → `agentrouter.org`
- `Dockerfile.relay` for durable Cloud Run later
- Live tunnel relay for deadline: Cloudflare Quick Tunnel in front of Tor on the agent host
- Vercel Production: `AGENTROUTER_USE_TOR=1` + relay URL/secret; smoke `smoke_llm_relay_ok`

### Note
Quick Tunnel URL is ephemeral — keep relay+tunnel up through judging, then move to Cloud Run (`Dockerfile.relay`) for permanence.


## 2026-09-27 — Vercel production live

### Shipped
- Linked Vercel project `teamtitanlink/bond` → GitHub `henrysammarfo/bond`
- Production env synced; **Tor ON via HTTPS relay** (`AGENTROUTER_USE_TOR=1` + `AGENTROUTER_RELAY_URL`)
- SSO deployment protection disabled for public judging
- **Production URL:** https://bond-pi.vercel.app (`/`, `/vaults`, `/evidence`, `/login` → 200)

### Still needed for live win
1. **Fund** platform AgentKit `0x1eFBb041E94aCc18D50C578eD34c265075d3b14e` with **≥104 USDC** (`0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`) + **AVAX gas** (wallet currently 0/0)
2. Register → Scan → Subscribe → capture Pending + Snowscan txs → fill WIN_CHECKLIST
3. X post + @openservai + OpenServ form before **28 Sep 2026 00:00 UTC**
4. **Rotate** chat-pasted secrets (Vercel token, Neon, CDP, OpenServ, AgentRouter, etc.) after submission

### Notes
- Keep Tor relay + Cloudflare tunnel up through judging (or move to Cloud Run `Dockerfile.relay`)
- Do not commit `.env.local` / Vercel token / relay secret


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


## 2026-09-27 — Demo V2 + OpenServ submission kit

### Shipped
- `bond-demo-v2/` Hyperframes RECEIPT LEDGER redo (paper rail, kinetic ALLOCATE/PENDING/NO, punch-cuts — not v1 dark grain)
- Liam ElevenLabs VO regenerated; delivery + X encode in `/opt/cursor/artifacts/bond-openserv-v2-*.mp4`
- `docs/memory/SUBMIT_KIT.md` — form answers + Blue Tick X post with @openservai
- Live Path A screen capture in progress (password masked); rotate `demo@bond.app` after record
- AgentKit funded ≈105 USDC + AVAX on `0x1eFBb041…3b14e`

### Submit
- Live: https://bond-pi.vercel.app
- GitHub: https://github.com/henrysammarfo/bond
- Post X with video + tag @openservai before 28 Sep 2026 00:00 UTC
- Demo password rotated after live record (offline artifact only)


## 2026-09-27 — Live record + vault route fix

### Shipped
- Fixed `/dashboard/vaults/$vaultId` (and subscriptions detail) — parents lacked `<Outlet />`; detail never mounted. Deployed to production.
- Live capture: login (masked) → Wallet 105 USDC → mandate → Scan ALLOCATE (BNB) → Avalanche subscribe attempt → **preflight REJECT** (concentration / NAV) — fail-closed money shot.
- Hyperframes V2 ledger video SHIP; artifacts under `/opt/cursor/artifacts/`.
- `demo@bond.app` password rotated; provisioner requires `DEMO_PASSWORD` env (no hardcoded secret).


## 2026-09-27 — Live BNB Path A + synced demo + brand docs

### Shipped
- Bridged Avalanche USDC → BSC via LI.FI; live IXS subscribe **104 USDC** on BNB vault `6a26624ca7d16b245d665475`
- Approve `0x7680eaa0…` + requestDeposit `0x227cb6a9…` on BscScan; subscription `a974083b-…` **Pending**
- Nested MCP `tx.to`/`tx.data` unwrap so AgentKit signs real approve/deposit calls
- Synced Liam VO Hyperframes cut: `artifacts/demo/bond-live-path-a-synced-x.mp4` + stills
- OpenServ form Q5 SERV blanks + Q6 cream-on-forest logotypes in `docs/brand/`
- README + memory MDs: logos render via relative PNG paths; mermaid diagrams scrubbed for GitHub (no middle-dots / slash-heavy labels)
- `SUBMIT_KIT.md` / `LIVE_PROOF.md` / `WIN_CHECKLIST.md` point at `main` artifact paths after merge
