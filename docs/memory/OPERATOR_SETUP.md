# BOND — Operator setup (win the RWA track)

Deadline: **28 Sep 2026, 00:00 UTC** · Track: [OpenServ RWA Vaults (IXS)](https://www.openserv.ai/hackathon)

Primary vault (live): Avalanche `0xaD01573b459805E3954398796203d830B57A8bD9` · vaultId `6a952729732c2b84b55ce89d`  
Docs: [IXS Vault API](https://api-v2.ixs.finance/docs) · [IXS agent skills](https://github.com/IXS-Finance/ixs-rwa-agent-skills)

---

## 1. Accounts & links (open these)

| Need | Link | What to do |
| --- | --- | --- |
| OpenServ + SERV | [openserv.ai/hackathon](https://www.openserv.ai/hackathon) · [console.openserv.ai](https://console.openserv.ai) | Enable org data collection; get **OPENSERV_API_KEY** (~$5 starter credit on signup) |
| Coinbase CDP / AgentKit wallet | [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com) | Create API keys + Avalanche wallet; export **AGENT_PRIVATE_KEY** / note address |
| Neon Postgres | [console.neon.tech](https://console.neon.tech) | Create project → copy **DATABASE_URL** |
| AgentRouter (no OpenAI key) | [agentrouter.org](https://agentrouter.org) · token console | Create key → **AGENTROUTER_API_KEY** · base `https://agentrouter.org/v1` |
| TinyFish (fact-check ops) | [agent.tinyfish.ai](https://agent.tinyfish.ai) · **[Pay $10 wallet](https://agent.tinyfish.ai/wallet?utm_source=api&utm_medium=insufficient_funds&utm_campaign=automation)** | Top up, then set **TINYFISH_API_KEY** |
| Tavily | [app.tavily.com](https://app.tavily.com) | Refresh quota / new key → **TAVILY_API_KEY** |
| IXS live vault list | [api-v2.ixs.finance/vaults](https://api-v2.ixs.finance/vaults) | Confirm Avalanche vault still listed |
| Avalanche explorer | [snowscan.xyz](https://snowscan.xyz) | Watch txs after deposit |
| USDC on Avalanche | Contract `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | Fund **≥100 USDC** + **AVAX for gas** to AgentKit address |
| GitHub PR | [bond PR #1](https://github.com/henrysammarfo/bond/pull/1) | Review / merge when ready |
| Lovable project | [lovable.dev project](https://lovable.dev/projects/6f5bea9d-5377-4269-8be8-dd1096a81c81) | Env secrets sync with connected branch |
| Submit | X post + [@openservai](https://x.com/openservai) + form from [hackathon page](https://www.openserv.ai/hackathon) | Before deadline |

**Rotate** any keys that were pasted in chat.

---

## 2. Wire secrets (hosting / Lovable / local)

Copy [`.env.example`](../.env.example) into Lovable/Vercel/Cloudflare secrets **and** local `.env.local`:

```bash
cp .env.example .env.local
# edit .env.local — never commit it
```

Minimum to run the app:

1. `DATABASE_URL` — Neon  
2. `SESSION_SECRET` — random ≥32 chars (`openssl rand -hex 32`)  
3. `AGENT_PRIVATE_KEY` — CDP/AgentKit Avalanche wallet private key  
4. `AGENTROUTER_API_KEY` — mandate reasoning (required if OpenServ endpoint unavailable)  
5. Optional but recommended: `OPENSERV_API_KEY`, `CDP_WALLET_ADDRESS`, `CDP_*`

Defaults already correct:

- `IXS_API_BASE_URL=https://api-v2.ixs.finance`
- `IXS_MCP_URL=https://api-v2.ixs.finance/mcp`
- `IXS_PRIMARY_VAULT_ID=6a952729732c2b84b55ce89d`

---

## 3. Database + local app

```bash
bun install
bun run db:push          # applies Drizzle schema to Neon
bun run dev              # http://localhost:5173
bun run build            # must stay green
bun test                 # status machine + live IXS read
```

---

## 4. Fund the wallet (real money — Bible)

1. In CDP portal, open the Avalanche wallet address (or whatever `AGENT_PRIVATE_KEY` derives).  
2. Send **≥ 100 USDC** (Avalanche native USDC above) + enough **AVAX** for approve + requestDeposit (+ claim later).  
3. Confirm balances on [snowscan.xyz](https://snowscan.xyz).  
4. No public testnet for this track — mocks will not win.

---

## 5. Demo the live product (shot list)

Do this after secrets + DB + funding:

| Step | URL | What to show |
| --- | --- | --- |
| A | `/` | Cinematic BOND hero |
| B | `/vaults` | Live IXS Avalanche (+ BNB browse) cards |
| C | `/how-it-works` | Allow → Deposit → Pending → Shares |
| D | `/login` | Register org (httpOnly session) |
| E | `/dashboard` | Live overview (no invented owned $) |
| F | `/dashboard/mandates` | Create Avalanche USDC mandate ≥$100 |
| G | `/dashboard/vaults/$primaryVaultId` | Confirm live deposit → **Pending not earning** |
| H | `/dashboard/subscriptions/$id` | Refresh / claim when IXS ready → shares |

Fill evidence in [`WIN_CHECKLIST.md`](./WIN_CHECKLIST.md) (tx hashes + demo URL).

---

## 6. Submit checklist

1. Public demo URL live  
2. X post: name, concept, images/screenshots, GitHub/demo links, tag **@openservai**  
3. Fill the official form linked from [openserv.ai/hackathon](https://www.openserv.ai/hackathon)  
4. Org data collection enabled in OpenServ console  
5. Screenshots show **Pending** until shares — never “earning” early  

---

## Quick commands

```bash
# Live IXS preflight (no spend)
LIVE_DEPOSIT=1 bun run e2e:deposit

# Fact-check vault still exists
curl -s https://api-v2.ixs.finance/vaults/6a952729732c2b84b55ce89d | head
```
