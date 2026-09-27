#!/usr/bin/env bun
/**
 * Smoke AgentRouter via Tor. Expect: smoke_llm_tor_ok
 * Usage: bun run smoke:llm
 */
import { config } from "dotenv";
config({ path: ".env.local" });

process.env.AGENTROUTER_USE_TOR = process.env.AGENTROUTER_USE_TOR ?? "1";

const { agentRouterChat, agentRouterModel, AGENTROUTER_BASE } = await import("../src/backend/llm/agentrouter");

const ip = await (async () => {
  const { SocksProxyAgent } = await import("socks-proxy-agent");
  const https = await import("node:https");
  const agent = new SocksProxyAgent(process.env.AGENTROUTER_TOR_SOCKS ?? "socks5h://127.0.0.1:9050");
  return new Promise<string>((resolve, reject) => {
    https
      .get("https://api.ipify.org", { agent }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      })
      .on("error", reject);
  });
})();

console.log("tor", process.env.AGENTROUTER_TOR_SOCKS ?? "socks5h://127.0.0.1:9050", "egress", ip);
console.log("base", AGENTROUTER_BASE, "model", agentRouterModel());

const content = await agentRouterChat(
  [
    {
      role: "system",
      content: 'Reply JSON only: {"pong":true,"model_ok":true}',
    },
    { role: "user", content: "ping" },
  ],
  { temperature: 0, responseFormat: "json_object" },
);

console.log("decision", content);
JSON.parse(content);
console.log("smoke_llm_tor_ok");
