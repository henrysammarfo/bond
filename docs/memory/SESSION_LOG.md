# Session log

## 2026-09-27 — plan → implement

- Confirmed Path A (live RWA product).
- Verified Avalanche primary vault via live IXS API.
- Tavily: plan usage limit exceeded (needs quota refresh).
- TinyFish: API key valid; wallet $0.00 — top up required for agent runs.
- AgentRouter: use `https://agentrouter.org/v1` (not `api.agentrouter.org`).
- `aftercut` folder not present on cloud VM.
- Implemented: memory docs, rules, skills, Neon/Drizzle schema, httpOnly sessions, IXS REST+MCP, AgentKit Avalanche signer, SERV/AgentRouter mandate gate, live dashboard, Orbit-grade home, login/register.
- Pending operator: set env secrets, `bun run db:push`, fund Avalanche wallet, run live deposit, fill WIN_CHECKLIST.
- Added `docs/memory/OPERATOR_SETUP.md` with linked step-by-step setup.
- Captured public page screenshots under `docs/memory/screenshots/` (home, vaults, how-it-works, login, product, security, docs).
