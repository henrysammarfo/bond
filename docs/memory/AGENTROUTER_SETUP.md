# AgentRouter setup for BOND (Tor on cloud VMs)

Cloud egress to `agentrouter.org` often returns **Aliyun WAF captcha HTML** (not a bad key).  
Fix on Cursor/GCP/local workers: **Tor SOCKS**. Prefer host `https://agentrouter.org` (not `co.agentrouter.org`).

Aligned with VIGIL operator guidance; implemented in `src/backend/llm/agentrouter.ts`.

## Env

```bash
AGENTROUTER_API_KEY=sk-...          # never commit / never VITE_*
AGENTROUTER_BASE_URL=https://agentrouter.org/v1
AGENTROUTER_USE_TOR=1
AGENTROUTER_TOR_SOCKS=socks5h://127.0.0.1:9050
AGENTROUTER_MODEL=deepseek-v4-flash
```

## Commands

```bash
bun run tor:start     # socks5h://127.0.0.1:9050
bun run smoke:llm     # expect smoke_llm_tor_ok
```

Success sample:

```
tor socks5h://127.0.0.1:9050 egress <exit-ip>
base https://agentrouter.org/v1 model deepseek-v4-flash
decision {"pong":true,"model_ok":true}
smoke_llm_tor_ok
```

## Headers (already sent)

`User-Agent: QwenCode/0.2.0 (linux; x64)` + `x-stainless-*` as in VIGIL.

## Vercel / Lovable (no Tor in Functions)

Serverless IPs also WAF. Options:

1. Deploy a small relay Worker that forwards to AgentRouter (optionally Tor on that host).
2. Or run mandate reasoning only on a Tor-capable worker.

Never put `AGENTROUTER_API_KEY` in client bundles.

## Failure table

| Symptom | Fix |
| --- | --- |
| HTML / aliyun_waf | `bun run tor:start` + `AGENTROUTER_USE_TOR=1` |
| Budget exhausted | Keep `deepseek-v4-flash` or top up |
| Invalid key on co.agentrouter.org | Use `agentrouter.org` only |
