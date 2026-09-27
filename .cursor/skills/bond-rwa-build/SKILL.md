---
name: bond-rwa-build
description: Builds and verifies the BOND live RWA product — SERV mandate, AgentKit Avalanche deposit, IXS Pending until shares. Use when implementing BOND vaults, deposits, dashboard, or hackathon submission.
---

# BOND RWA Build

## Instructions

1. Read `docs/memory/BOND_BIBLE.md`, `VAULT_LIVE.md`, `STACK.md`.
2. Prefer existing `src/backend/` modules over new patterns.
3. Deposit path (exact order):
   - Session + org
   - Mandate allows ≥100 USDC on Avalanche for primary vault
   - SERV allow (deny stops)
   - IXS `vault_get` → settlement
   - MCP `vault_build_request_deposit` → AgentKit execute steps
   - Persist **Pending**; UI not earning
   - Poll request status + positions
   - Claim if required → **Finalized** only with live share proof
4. Never invent balances. Never use DemoContext simulation.
5. Update `docs/memory/SESSION_LOG.md` and `WIN_CHECKLIST.md` with real tx hashes.

## Examples

- Adding a dashboard KPI: load from serverFn that queries DB pending + IXS positions.
- Fixing “shares showing early”: remove any code path that sets Finalized without live share balance.
