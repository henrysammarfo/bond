# BOND locked stack

## App

- TanStack Start + React 19 + Tailwind v4 + Lucide (this Lovable repo)
- Server: TanStack `createServerFn` under `src/backend/`
- DB: Neon Postgres + Drizzle (multitenant)
- Sessions: httpOnly Secure SameSite=Lax cookie → server session row
- **Banned:** `localStorage` / `sessionStorage` for auth, balances, subscriptions
- **Banned:** mock deposits, invented balances, soft-pass on SERV deny, silent IXS failures

## Live integrations

| System | Role |
| --- | --- |
| IXS REST + MCP | Vault reads, unsigned deposit/claim calldata |
| Coinbase CDP / AgentKit wallet | Avalanche mainnet sign + send (via `AGENT_PRIVATE_KEY` export) |
| OpenServ SERV | Mandate allow/deny reasoning |
| AgentRouter `https://agentrouter.org/v1` | LLM (no OpenAI key) |
| Tavily / TinyFish | Fact-check only (ops), not product UX |

## Env var names (values in secrets — never commit)

`DATABASE_URL`, `SESSION_SECRET`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`, `AGENT_PRIVATE_KEY` (or `CDP_WALLET_PRIVATE_KEY`), `CDP_WALLET_ADDRESS`, `OPENSERV_API_KEY`, `AGENTROUTER_API_KEY`, `IXS_API_BASE_URL`, `IXS_MCP_URL`, `IXS_PRIMARY_VAULT_ID`, `TAVILY_API_KEY`, `TINYFISH_API_KEY`, `VENICE_API_KEY` (optional), `LIVE_DEPOSIT` (e2e gate)

Defaults for non-secret URLs:

- `IXS_API_BASE_URL=https://api-v2.ixs.finance`
- `IXS_MCP_URL=https://api-v2.ixs.finance/mcp`
- `IXS_PRIMARY_VAULT_ID=6a952729732c2b84b55ce89d`

## No-fallback policy

If IXS/CDP/SERV/DB is down or misconfigured: return a typed error to the UI. Do not substitute fixtures, zero shares, or “demo” success.
