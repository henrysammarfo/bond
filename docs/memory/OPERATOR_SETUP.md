# BOND — Operator setup (win the RWA track)

Deadline: **28 Sep 2026, 00:00 UTC** · Track: [OpenServ RWA Vaults (IXS)](https://www.openserv.ai/hackathon)

Primary vault (live): Avalanche `0xaD01573b459805E3954398796203d830B57A8bD9` · vaultId `6a952729732c2b84b55ce89d`  
Companion vault (live): BNB Chain · vaultId `6a26624ca7d16b245d665475`  
Docs: [IXS Vault API](https://api-v2.ixs.finance/docs) · [IXS agent skills](https://github.com/IXS-Finance/ixs-rwa-agent-skills)

## Product mode (read first)

BOND is a **multitenant all-around RWA treasury app** for the OpenServ track:

- Orgs **register / login / logout** (httpOnly sessions, Neon).
- Each org gets its **own AgentKit EVM signer** (encrypted) for Avalanche + BNB. Settings → Integrations: connect **your own SERV / AgentRouter** keys, import or rotate agent key, or use platform fallback for judges.
- SERV mandate gate → live IXS subscribe → **Pending until shares** + explorer proofs.

Platform keys cover the fair demo path; BYO keys let judges and treasuries run on their own credentials. See [`SECURITY.md`](./SECURITY.md) · [`TECHNICAL_DEEP_DIVE.md`](./TECHNICAL_DEEP_DIVE.md).

---

## 1. Accounts & links (open these)

| Need | Link | What to do |
| --- | --- | --- |
| OpenServ + SERV | [openserv.ai/hackathon](https://www.openserv.ai/hackathon) · [console.openserv.ai](https://console.openserv.ai) | Enable org data collection; get **OPENSERV_API_KEY** (~$5 starter credit on signup) |
| Coinbase CDP / AgentKit wallet | [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) · **[exact click-path](./CDP_AGENTKIT_FLOW.md)** | API key JSON ≠ Wallet Secret. Still need **[Generate Wallet Secret](https://portal.cdp.coinbase.com/wallets/non-custodial/security)**. Interim signer address ready to fund (see SESSION_LOG). |
| Neon Postgres | [console.neon.tech](https://console.neon.tech) · project `aged-flower-56535737` | `NEON_API_KEY` wired → schema **pushed** |
| AgentRouter (no OpenAI key) | [agentrouter.org](https://agentrouter.org) · **[Tor setup](./AGENTROUTER_SETUP.md)** | Key + `bun run tor:start` + `bun run smoke:llm` (`deepseek-v4-flash`) |
| TinyFish (fact-check ops) | [agent.tinyfish.ai](https://agent.tinyfish.ai) · **[Pay $10 wallet](https://agent.tinyfish.ai/wallet?utm_source=api&utm_medium=insufficient_funds&utm_campaign=automation)** | Top up, then set **TINYFISH_API_KEY** |
| Tavily | [app.tavily.com](https://app.tavily.com) | Refresh quota / new key → **TAVILY_API_KEY** |
| IXS live vault list | [api-v2.ixs.finance/vaults](https://api-v2.ixs.finance/vaults) | Confirm Avalanche + BNB vaults still listed |
| Avalanche explorer | [snowscan.xyz](https://snowscan.xyz) | Watch Avalanche txs after deposit |
| BNB explorer | [bscscan.com](https://bscscan.com) | Watch BNB Chain txs after deposit |
| USDC on Avalanche | Contract `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | Fund **≥100 USDC** + **AVAX for gas** to AgentKit address |
| USDC on BNB | Contract `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | Fund **≥100 USDC** + **BNB for gas** for the companion vault |
| GitHub PR | [bond PR #1](https://github.com/henrysammarfo/bond/pull/1) | Review / merge when ready |
| Submit | X post + [@openservai](https://x.com/openservai) + form from [hackathon page](https://www.openserv.ai/hackathon) | Before deadline |

**Rotate** any keys that were pasted in chat.

---

## Neon (this project)

Project id: **`aged-flower-56535737`** · branch: **production**

Cloud agent cannot complete interactive `neon auth` in a headless VM. Do either:

### Option A — paste connection string (fastest)

1. Open [console.neon.tech](https://console.neon.tech) → project **aged-flower-56535737** → **production**.
2. **Connection details** → copy the pooled `DATABASE_URL` (starts with `postgresql://…`).
3. Put it in `.env.local` / hosting secrets as `DATABASE_URL=...` (never commit).
4. Then locally / in agent:

```bash
bun run db:push
```

### Option B — Neon CLI with API key (non-interactive)

1. Neon console → Account → [API keys](https://console.neon.tech/app/settings/api-keys) → create key.
2. Run:

```bash
export NEON_API_KEY=napi_...
bunx neon@latest connection-string aged-flower-56535737 --branch production --prisma
# or:
bunx neon@latest connection-string --project-id aged-flower-56535737 --branch production
```

3. Save output as `DATABASE_URL`, then `bun run db:push`.

Skip the Neon Functions `neon.ts` / `hello.ts` scaffold for BOND — we use Drizzle + TanStack serverFns, not Neon Functions preview.

---

## CDP wallet (exact)

Full click-path: [`CDP_AGENTKIT_FLOW.md`](./CDP_AGENTKIT_FLOW.md).

```bash
# After CDP_API_KEY_ID / CDP_API_KEY_SECRET / CDP_WALLET_SECRET are in .env.local:
bun run cdp:export
# paste printed AGENT_PRIVATE_KEY + CDP_WALLET_ADDRESS into .env.local
# fund ≥100 USDC (0xB97E…48a6E) + AVAX on Avalanche to that address
# for BNB lane: same address needs BSC USDC + BNB gas
```

---

## Env template

Copy [`.env.example`](../../.env.example) into Vercel / Cloudflare secrets **and** local `.env.local`:

```bash
cp .env.example .env.local
# edit .env.local — never commit it
```

Minimum to run the app:

1. `DATABASE_URL` — Neon  
2. `SESSION_SECRET` — random ≥32 chars (`openssl rand -hex 32`)  
3. `AGENT_PRIVATE_KEY` — from `bun run cdp:export`  
4. `AGENTROUTER_API_KEY` + Tor on cloud (`bun run tor:start`) — failover if SERV down  
5. `OPENSERV_API_KEY` — SERV Reasoning at `https://inference-api.openserv.ai`  
6. Optional: `CDP_WALLET_ADDRESS`, `TAVILY_API_KEY`, `TINYFISH_API_KEY`, `VITE_PUBLIC_ANALYTICS_ID`

Defaults already correct:

- `IXS_API_BASE_URL=https://api-v2.ixs.finance`
- `IXS_MCP_URL=https://api-v2.ixs.finance/mcp`
- `IXS_PRIMARY_VAULT_ID=6a952729732c2b84b55ce89d`
- `IXS_BNB_VAULT_ID=6a26624ca7d16b245d665475`
- `OPENSERV_API_BASE_URL=https://inference-api.openserv.ai`
- `AGENTROUTER_BASE_URL=https://agentrouter.org/v1`
- `AGENTROUTER_MODEL=deepseek-v4-flash`

---

## 3. Database + local app

```bash
bun install
bun run db:push
bun run tor:start   # cloud IP → AgentRouter
bun run dev
```

Open http://localhost:3000 → Register → Settings → Integrations → Mandates → Vaults → Confirm live deposit.

---

## Live win path

1. Fund org AgentKit address (≥100 USDC + gas on the chain you use).  
2. Create matching mandate (Avalanche or BNB Chain).  
3. Subscribe → Pending + explorer link.  
4. Wait for shares → Refresh / Claim.  
5. Capture screenshots for [`WIN_CHECKLIST.md`](./WIN_CHECKLIST.md).
