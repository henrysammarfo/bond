#!/usr/bin/env bun
/**
 * Smoke AgentRouter via HTTPS Tor relay (serverless path).
 * Requires AGENTROUTER_RELAY_URL + AGENTROUTER_RELAY_SECRET.
 * Expect: smoke_llm_relay_ok
 */
import { config } from "dotenv";
config({ path: ".env.local" });

if (!process.env.AGENTROUTER_RELAY_URL || !process.env.AGENTROUTER_RELAY_SECRET) {
  console.error("Set AGENTROUTER_RELAY_URL and AGENTROUTER_RELAY_SECRET first.");
  process.exit(1);
}

// Force relay path (unset local SOCKS preference — relay does Tor).
delete process.env.AGENTROUTER_USE_TOR;

const { agentRouterChat, agentRouterModel } = await import("../src/backend/llm/agentrouter");

const health = await fetch(`${process.env.AGENTROUTER_RELAY_URL.replace(/\/$/, "")}/health`);
const healthJson = await health.json();
console.log("relay health", health.status, healthJson);

const content = await agentRouterChat(
  [
    {
      role: "system",
      content: 'Reply JSON only: {"pong":true,"model_ok":true,"via":"relay"}',
    },
    { role: "user", content: "ping" },
  ],
  { temperature: 0, responseFormat: "json_object" },
);

console.log("decision", content);
JSON.parse(content);
console.log("model", agentRouterModel());
console.log("smoke_llm_relay_ok");
