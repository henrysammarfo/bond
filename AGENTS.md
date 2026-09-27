## Project architecture

- Public pages use shared `SiteHeader`/`SiteFooter`.
- Dashboard pages live under `/dashboard` with **live server state**: Neon Postgres sessions (httpOnly cookies), org tenancy, IXS REST/MCP (Avalanche + BNB), AgentKit deposits, SERV mandate gate.
- Product rule: deposits stay **Pending** until live vault shares are proven. No invented balances. No `localStorage` for auth or funds.
- Agent memory: `docs/memory/`. Cursor rules: `.cursor/rules/`. Skills: `.cursor/skills/bond-*`.
- Hosting: Vercel / Cloudflare. Secrets only in server env — never `VITE_*` for API keys.
