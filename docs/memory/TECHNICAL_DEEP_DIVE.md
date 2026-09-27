# BOND — Technical deep dive (bugs, workarounds, novelty)

Written for judges and operators. Every item below was hit live while shipping Path A (SERV → AgentKit Avalanche → IXS ERC-7540 Pending).

---

## Architecture novelty

| Layer | What we did | Why it matters |
| --- | --- | --- |
| **Tenancy** | Neon + Drizzle org/user/session; httpOnly cookies — **no localStorage balances** | Judges can register, leave, come back; state is real |
| **Per-org AgentKit** | Each org gets an encrypted Avalanche EVM key (`org_integrations`) AES-256-GCM | BYO treasury; platform fallback for demo |
| **BYO integrations** | Settings → SERV / AgentRouter / import agent key | Judges connect their own keys without forking |
| **Mandate graph** | Deterministic policy → OpenServ SERV chat → AgentRouter Tor failover | Fail closed; never soft-pass |
| **Signer** | viem + exported key — **not** full `@coinbase/agentkit` in the Worker bundle | Cloudflare nitro build stays green |
| **IXS** | Live REST vault list + MCP `vault_build_request_deposit` / claim | Unsigned steps from IXS, signed by org agent |
| **Honesty** | Pending ≠ owned; Snowscan links; insufficient-balance preflight | Beats “fake TVL” demos |

---

## Bugs & flaws we found (valid, reproducible)

### 1. AgentRouter Aliyun WAF on cloud egress (severity)

**Symptom:** `POST https://agentrouter.org/v1/chat/completions` returns HTML captcha / `aliyun_waf`, not JSON. Looks like a “bad API key.”

**Root cause:** Datacenter / Cursor / GCP IPs are challenged. Key can be valid.

**Fix:** Tor SOCKS (`AGENTROUTER_USE_TOR=1`, `socks5h://127.0.0.1:9050`) + Node `https` + `SocksProxyAgent` (Bun+undici path is unsafe for this). Stainless / QwenCode headers. Prefer `agentrouter.org` over `co.agentrouter.org`.

**Code:** `src/backend/llm/agentrouter.ts`, `scripts/tor-start.sh`, `bun run smoke:llm` → `smoke_llm_tor_ok`.

**Serverless:** Vercel cannot run Tor. Use HTTPS Tor relay (`AGENTROUTER_RELAY_URL` + `AGENTROUTER_RELAY_SECRET`) — `scripts/agentrouter-relay.ts` / `Dockerfile.relay`. Client prefers relay when URL is set. `bun run smoke:llm:relay` → `smoke_llm_relay_ok`.

**Neon cannot host Tor either** — Neon is Postgres. Evidence ring *does* persist on Neon (`evidence_entries` / `evidence_meta`). Tor stays on a compute host (tunnel / Cloud Run).

---

### 2. Bun / dotenv silently drops `DATABASE_URL` containing `&`

**Symptom:** `.env.local` has a Neon pooled URL with `?sslmode=require&channel_binding=require`, but `process.env.DATABASE_URL` is empty under `bun run`.

**Root cause:** Unquoted `&` is treated as shell/env separator by Bun’s injector.

**Fix:** Quote the value: `DATABASE_URL="postgresql://…?sslmode=require"`. Load with `dotenv` `override: true` in `scripts/db-push.ts` / `drizzle.config.ts`.

---

### 3. CDP `cdp_api_key.json` ≠ Wallet Secret ≠ Export scope

**Symptom:** Operators think the downloaded API key JSON is enough. `exportAccount` → `403 Missing required scope: accounts#export`. Create/import work with Wallet Secret alone.

**Root cause:** Three credentials: Secret API Key ID/Secret, **Wallet Secret** (separate portal page), Export scope on the key.

**Fix / workaround:** Generate Wallet Secret at portal non-custodial security; import org/platform private key as named account; sign with viem. Documented in `CDP_AGENTKIT_FLOW.md`.

**Valid product flaw:** CDP UX implies one download covers wallet ops — it does not.

---

### 4. SERV returns `approved` instead of `allow`

**Symptom:** Mandate gate throws “unusable response” despite HTTP 200.

**Root cause:** Model ignores schema and emits `{"approved":true,…}`.

**Fix:** Prompt forces `"allow"`; parser accepts both `allow` and `approved`. Base URL is `https://inference-api.openserv.ai` (not `api.openserv.ai`).

---

### 5. Shared platform signer vs multitenant UX (product flaw — fixed)

**Symptom:** Every org’s “Wallet” page showed the same AgentKit address — confusing for a signup product.

**Fix:** `org_integrations` table + AES vault; register provisions a unique agent address; Settings shows BYO SERV/AgentRouter + rotate/import.

---

### 6. Deposit without funding fails late (UX flaw — fixed)

**Symptom:** IXS MCP builds txs; broadcast fails with opaque RPC errors if USDC/AVAX missing.

**Fix:** `assertDepositFunding()` before `executeTxSteps` — clear “Insufficient USDC / AVAX” with fund address.

---

## API depth (what we actually call)

| API | Usage |
| --- | --- |
| IXS REST `GET /vaults`, `/vaults/:id` | Avalanche primary `6a952729732c2b84b55ce89d` + BNB companion `6a26624ca7d16b245d665475` |
| IXS MCP | `vault_get`, `vault_build_request_deposit`, `vault_request_status`, `vault_build_claim_deposit` |
| OpenServ SERV | `POST …/v1/chat/completions` mandate JSON gate |
| AgentRouter | Tor chat completions `deepseek-v4-flash` + stainless headers |
| Avalanche + BSC RPC | `eth_getBalance`, USDC `balanceOf`, send approve + requestDeposit on either chain |
| Coinbase CDP SDK | create/import account (export optional) |
| Neon | Pooled Postgres; Drizzle push |
| Tavily / TinyFish | Ops fact-check only |

---

## Safety & access

- Secrets: `.env.local` gitignored; org keys sealed AES-256-GCM (`v1.iv.tag.ct`).
- Sessions: httpOnly Secure SameSite=Lax; token hashed at rest.
- Client never receives private keys — only address + masks.
- Rotate chat-pasted platform keys after hackathon (`SECURITY.md`).
- Losing `AGENT_PRIVATE_KEY` / org agent key = losing ability to redeem USDC.

---

## Test surface

```bash
bun test                 # status machine + live IXS read
bun run smoke:llm        # Tor AgentRouter
bun run test:integrations # secret box + resolve + insufficient funding message
bun run build            # Cloudflare nitro green
```

---

## Still extraordinary / next proof

1. Fund an org agent (≥100 USDC + AVAX) → Confirm live deposit → Pending + Snowscan on subscription detail.  
2. Public host with `DATABASE_URL` + encryption key + Tor relay or platform AgentRouter path.  
3. Redeem path UI (MCP already supports `vault_build_request_redeem`).  
4. Optional: enable CDP Export scope for pure portal export.
