#!/usr/bin/env bun
/**
 * Tor egress relay for AgentRouter — Vercel/serverless cannot run Tor locally.
 *
 * Vercel → HTTPS (this relay) → SOCKS Tor → https://agentrouter.org/v1
 *
 * Auth: every request must include header `x-bond-relay-secret: $AGENTROUTER_RELAY_SECRET`
 * Upstream key: request `Authorization: Bearer <agentrouter-key>` is forwarded as-is (supports BYO).
 *
 * Usage:
 *   bun run tor:start
 *   bun run scripts/agentrouter-relay.ts
 */
import * as http from "node:http";
import * as https from "node:https";
import { timingSafeEqual } from "node:crypto";
import { SocksProxyAgent } from "socks-proxy-agent";

const PORT = Number(process.env.PORT ?? process.env.AGENTROUTER_RELAY_PORT ?? 8787);
const SECRET = process.env.AGENTROUTER_RELAY_SECRET?.trim();
const TOR_SOCKS = process.env.AGENTROUTER_TOR_SOCKS ?? "socks5h://127.0.0.1:9050";
/** Origin only — request path already includes /v1/... */
const rawUpstream =
  process.env.AGENTROUTER_UPSTREAM_ORIGIN ?? process.env.AGENTROUTER_BASE_URL ?? "https://agentrouter.org";
const UPSTREAM_ORIGIN = rawUpstream.replace(/\/v1\/?$/, "").replace(/\/$/, "") || "https://agentrouter.org";

if (!SECRET || SECRET.length < 24) {
  console.error("Set AGENTROUTER_RELAY_SECRET to a long random string (≥24 chars).");
  process.exit(1);
}

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function unauthorized(res: http.ServerResponse) {
  res.writeHead(401, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "unauthorized" }));
}

function torEgressIp(): Promise<string> {
  const agent = new SocksProxyAgent(TOR_SOCKS);
  return new Promise((resolve, reject) => {
    https
      .get("https://api.ipify.org", { agent, timeout: 20_000 }, (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => resolve(d.trim() || "unknown"));
      })
      .on("error", reject);
  });
}

function upstreamViaTor(
  method: string,
  upstreamPath: string,
  headers: Record<string, string>,
  body: Buffer,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  const agent = new SocksProxyAgent(TOR_SOCKS);
  const url = new URL(upstreamPath.startsWith("http") ? upstreamPath : `${UPSTREAM_ORIGIN}${upstreamPath}`);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          ...headers,
          host: url.host,
          "content-length": body.length,
        },
        agent,
        timeout: 90_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 502,
            headers: res.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("upstream timeout via Tor"));
    });
    if (body.length) req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
    try {
      const egress = await torEgressIp();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "bond-agentrouter-tor-relay", tor: true, egress, upstream: UPSTREAM_ORIGIN }));
    } catch (e) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    }
    return;
  }

  const got = String(req.headers["x-bond-relay-secret"] ?? "");
  const a = Buffer.from(got);
  const b = Buffer.from(SECRET);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    unauthorized(res);
    return;
  }

  if (req.method !== "POST" || !url.pathname.startsWith("/v1/")) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "missing_authorization_bearer_agentrouter_key" }));
    return;
  }

  try {
    const body = await readBody(req);
    const forwardHeaders: Record<string, string> = {
      Authorization: auth,
      "Content-Type": req.headers["content-type"] ?? "application/json",
      Accept: "application/json",
      "User-Agent": "QwenCode/0.2.0 (linux; x64)",
      "x-stainless-lang": "js",
      "x-stainless-package-version": "6.34.0",
      "x-stainless-os": "Linux",
      "x-stainless-arch": "x64",
      "x-stainless-runtime": "node",
      "x-stainless-runtime-version": `node/${process.versions.node}`,
      "x-stainless-retry-count": "0",
    };
    const up = await upstreamViaTor(req.method ?? "POST", url.pathname + url.search, forwardHeaders, body);
    const text = up.body.toString("utf8");
    if (text.trim().startsWith("<!") || text.toLowerCase().includes("aliyun_waf")) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "WAF_BLOCKED_VIA_TOR", detail: text.slice(0, 120) }));
      return;
    }
    res.writeHead(up.status, {
      "content-type": up.headers["content-type"] ?? "application/json",
      "x-bond-relay": "tor",
    });
    res.end(up.body);
  } catch (e) {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`bond-agentrouter-tor-relay listening :${PORT}`);
  console.log(`tor ${TOR_SOCKS} → ${UPSTREAM_ORIGIN}`);
  console.log(`health GET /health · proxy POST /v1/chat/completions`);
});
