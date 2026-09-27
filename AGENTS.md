<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Project architecture

- Public pages use shared `SiteHeader`/`SiteFooter`.
- Dashboard pages live under `/dashboard` with **live server state**: Neon Postgres sessions (httpOnly cookies), org tenancy, IXS REST/MCP, CDP AgentKit Avalanche deposits, SERV mandate gate.
- Product rule: deposits stay **Pending** until live vault shares are proven. No invented balances. No `localStorage` for auth or funds.
- Agent memory: `docs/memory/`. Cursor rules: `.cursor/rules/`. Skills: `.cursor/skills/bond-*`.
