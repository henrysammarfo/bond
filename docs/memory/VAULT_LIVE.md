# Live IXS vault registry

Fetched: `GET https://api-v2.ixs.finance/vaults` on 2026-09-27. Re-fetch before any deposit; never invent balances.

## API

- REST base: `https://api-v2.ixs.finance`
- Endpoints: `GET /vaults`, `GET /vaults/:vaultId`, `GET /vaults/:vaultId/positions/:wallet`
- MCP: `POST https://api-v2.ixs.finance/mcp` (Streamable HTTP JSON-RPC)
- MCP tools (docs): `vaults_list`, `vault_get`, `vault_check_whitelist`, `vault_build_request_deposit`, `vault_build_request_redeem`, plus request-status / claim tools per IXS skills

## Primary (hackathon deposit)

```
vaultId:           6a952729732c2b84b55ce89d
name:              IX High Yield Bond (USDC)
symbol:            IXHYB
chainId:           43114
network:           avalanche-mainnet
contractAddress:   0xaD01573b459805E3954398796203d830B57A8bD9
requiresWhitelist: false
USDC:              0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E (decimals 6)
rpc:               https://api.avax.network/ext/bc/C/rpc
explorer:          https://snowscan.xyz
```

## Secondary (browse / compare)

```
vaultId:           6a26624ca7d16b245d665475
contractAddress:   0xc975a3EeF2e49F8eDdEf585340C43f15300fCB82
chainId:           56 (BSC)
requiresWhitelist: false
```

## Settlement honesty

Async ERC-7540: after `requestDeposit` confirms → UI **Pending** (not earning). Shares only after IXS fulfillment + claim when required. Position shares must come from live `GET .../positions/:wallet` or on-chain share balance — never fixtures.
