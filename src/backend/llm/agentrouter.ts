/**
 * AgentRouter client for BOND.
 * Cloud IPs often get Aliyun WAF HTML unless AGENTROUTER_USE_TOR=1.
 * Prefer https://agentrouter.org/v1 + stainless/QwenCode headers + deepseek-v4-flash.
 */
import * as https from "node:https";
import { SocksProxyAgent } from "socks-proxy-agent";

export const AGENTROUTER_BASE =
  process.env.AGENTROUTER_BASE_URL ?? "https://agentrouter.org/v1";

export function agentRouterModel(): string {
  return process.env.AGENTROUTER_MODEL ?? "deepseek-v4-flash";
}

function requireKey(): string {
  const key = process.env.AGENTROUTER_API_KEY;
  if (!key) throw new Error("AGENTROUTER_API_KEY is not configured.");
  return key;
}

function useTor(): boolean {
  return process.env.AGENTROUTER_USE_TOR === "1" || process.env.AGENTROUTER_USE_TOR === "true";
}

function torSocks(): string {
  return process.env.AGENTROUTER_TOR_SOCKS ?? "socks5h://127.0.0.1:9050";
}

export function stainlessHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
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
}

function assertJsonBody(text: string, context: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("<!") || trimmed.toLowerCase().includes("aliyun_waf")) {
    throw new Error(
      `AgentRouter WAF_BLOCKED (${context}). Direct cloud IP hit captcha HTML. Set AGENTROUTER_USE_TOR=1 and run bun run tor:start.`,
    );
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`AgentRouter returned non-JSON (${context}): ${trimmed.slice(0, 180)}`);
  }
}

async function postViaTor(path: string, body: unknown): Promise<unknown> {
  const apiKey = requireKey();
  const agent = new SocksProxyAgent(torSocks());
  const payload = JSON.stringify(body);
  const url = new URL(path.startsWith("http") ? path : `${AGENTROUTER_BASE}${path}`);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          ...stainlessHeaders(apiKey),
          "Content-Length": Buffer.byteLength(payload),
        },
        agent,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`AgentRouter ${res.statusCode}: ${text.slice(0, 300)}`));
            return;
          }
          try {
            resolve(assertJsonBody(text, "tor"));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function postDirect(path: string, body: unknown): Promise<unknown> {
  const apiKey = requireKey();
  const url = path.startsWith("http") ? path : `${AGENTROUTER_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: stainlessHeaders(apiKey),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`AgentRouter ${res.status}: ${text.slice(0, 300)}`);
  return assertJsonBody(text, "direct");
}

export async function agentRouterChat(messages: Array<{ role: string; content: string }>, opts?: {
  model?: string;
  temperature?: number;
  responseFormat?: "json_object" | "text";
}): Promise<string> {
  const model = opts?.model ?? agentRouterModel();
  const body: Record<string, unknown> = {
    model,
    temperature: opts?.temperature ?? 0,
    messages,
  };
  if (opts?.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }
  const data = (await (useTor() ? postViaTor("/chat/completions", body) : postDirect("/chat/completions", body))) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AgentRouter returned empty choices[0].message.content");
  return content;
}

/** @deprecated Prefer agentRouterChat — kept for call sites expecting OpenAI-like helper. */
export function getAgentRouterClient() {
  return {
    async chat(messages: Array<{ role: string; content: string }>) {
      return agentRouterChat(messages, { responseFormat: "json_object" });
    },
  };
}
