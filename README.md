# bond

Live RWA Vaults product for OpenServ Edition 01: SERV mandate → AgentKit/CDP Avalanche deposit → honest **Pending** until IXS shares exist.

## Setup

1. Copy [`.env.example`](.env.example) → `.env.local` and fill secrets (never commit keys).
2. `bun install`
3. `bun run db:push` (requires `DATABASE_URL`)
4. `bun run dev`

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | Local app |
| `bun run build` | Production build (must be 0 errors) |
| `bun run test` | Status unit tests + live IXS read |
| `bun run e2e:deposit` | Preflight with `LIVE_DEPOSIT=1` |
| `bun run db:push` | Push Drizzle schema to Neon |

## Memory / agent guides

See `docs/memory/`, `.cursor/rules/`, `.cursor/skills/bond-*`.

Built with [Lovable](https://lovable.dev/projects/6f5bea9d-5377-4269-8be8-dd1096a81c81).
