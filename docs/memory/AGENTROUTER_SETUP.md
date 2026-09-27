# AgentRouter setup for BOND (Tor + serverless relay)

Cloud egress to `agentrouter.org` often returns **Aliyun WAF captcha HTML** (not a bad key).  
Fix: exit via **Tor**. Prefer host `https://agentrouter.org` (not `co.agentrouter.org`).

Implemented in `src/backend/llm/agentrouter.ts` + `scripts/agentrouter-relay.ts`.

## Env

```bash
AGENTROUTER_API_KEY=sk-...          # never commit / never VITE_*
AGENTROUTER_BASE_URL=https://agentrouter.org/v1
AGENTROUTER_MODEL=deepseek-v4-flash

# Local VM / Cloud Run container (Tor on loopback)
AGENTROUTER_USE_TOR=1
AGENTROUTER_TOR_SOCKS=socks5h://127.0.0.1:9050

# Vercel / serverless (no Tor in Functions) — HTTPS relay that runs Tor for you
AGENTROUTER_RELAY_URL=https://<your-relay-host>
AGENTROUTER_RELAY_SECRET=<long-random≥24>
AGENTROUTER_USE_TOR=1               # keep on; client prefers RELAY_URL when set
```

## Local commands

```bash
bun run tor:start              # socks5h://127.0.0.1:9050
bun run smoke:llm              # expect smoke_llm_tor_ok
bun run relay:agentrouter      # Tor HTTPS relay on :8787
bun run smoke:llm:relay        # expect smoke_llm_relay_ok (needs RELAY_URL)
```

## Neon?

**No.** Neon is the Postgres database for sessions/orgs/evidence. It cannot run Tor or an HTTP relay. Put the relay on Cloud Run / a VM / Cloudflare Tunnel in front of `bun run relay:agentrouter`.

## Vercel path (required for production)

1. Run the relay where Tor works (`bun run relay:agentrouter`, or `Dockerfile.relay` on Cloud Run).
2. Publish HTTPS (Cloudflare Tunnel / Cloud Run URL).
3. Set on Vercel Production+Preview:
   - `AGENTROUTER_RELAY_URL`
   - `AGENTROUTER_RELAY_SECRET`
   - `AGENTROUTER_USE_TOR=1`
4. Client posts to relay with `x-bond-relay-secret`; relay forwards via Tor with the request’s AgentRouter Bearer (BYO keys work).

```bash
# Example: local relay + quick tunnel (demo / deadline)
bun run relay:agentrouter &
cloudflared tunnel --url http://127.0.0.1:8787
```

## Headers (already sent)

`User-Agent: QwenCode/0.2.0 (linux; x64)` + `x-stainless-*` as in VIGIL.

## Failure table

| Symptom | Fix |
| --- | --- |
| HTML / aliyun_waf | Tor path: local SOCKS or `AGENTROUTER_RELAY_URL` |
| relay 401 | Check `AGENTROUTER_RELAY_SECRET` matches both sides |
| Budget exhausted | Keep `deepseek-v4-flash` or top up |
| Invalid key on co.agentrouter.org | Use `agentrouter.org` only |

Never put `AGENTROUTER_API_KEY` or `AGENTROUTER_RELAY_SECRET` in client bundles.
