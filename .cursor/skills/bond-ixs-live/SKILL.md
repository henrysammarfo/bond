---
name: bond-ixs-live
description: Calls live IXS REST and MCP for BOND vault inspect, deposit build, request status, and claim. Use when working with IXS vaults, ERC-7540, or Avalanche USDC deposits.
---

# BOND IXS Live

## REST

```
GET {IXS_API_BASE_URL}/vaults
GET {IXS_API_BASE_URL}/vaults/{vaultId}
GET {IXS_API_BASE_URL}/vaults/{vaultId}/positions/{wallet}
```

Primary vaultId: `6a952729732c2b84b55ce89d`.

## MCP (`POST {IXS_MCP_URL}`)

1. `initialize` with protocolVersion `2024-11-05`
2. `tools/list`
3. `tools/call` — `vault_get`, `vault_build_request_deposit`, `vault_request_status`, `vault_build_claim_deposit` as available

Deposit build args: `vaultId`, `ownerAddress`, `assetAmount` (USDC base units as IXS expects).

## Rules

- Execute only the unsigned steps MCP returns — do not invent calldata.
- Async settlement: request confirmed ≠ shares. Keep **Pending** until claim/position proves shares.
- Non-2xx → throw; do not return fixture vaults.
