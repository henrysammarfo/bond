# Session log

## 2026-09-27 — plan → implement → wire keys

- Confirmed Path A (live RWA product).
- Verified Avalanche primary vault via live IXS API (`6a952729732c2b84b55ce89d` active).
- Wired gitignored `.env.local`: OpenServ, AgentRouter, TinyFish, Tavily, Neon project id.
- AgentRouter Tor: `smoke_llm_tor_ok` (deepseek-v4-flash, egress via SOCKS).
- SERV: live at `https://inference-api.openserv.ai` — mandate path prefers SERV chat completions, failover AgentRouter.
- Mandate smoke: allow via `serv` or `agentrouter`.
- Tavily search OK with new key. TinyFish Search API OK (`api.search.tinyfish.ai` + `X-API-Key`).
- Neon `aged-flower-56535737`: still need `DATABASE_URL` or `NEON_API_KEY` (headless `neon auth` cannot complete). Skip Neon Functions scaffold.
- CDP: exact flow in `CDP_AGENTKIT_FLOW.md` + `bun run cdp:export` (needs portal Secret API key + Wallet Secret + Export scope). Still blocked for live deposit until operator runs export + funds ≥100 USDC + AVAX.
- Screenshots: public pages under `docs/memory/screenshots/`. Dashboard auth shots need DB.
