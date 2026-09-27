import { agentRouterChat } from "../llm/agentrouter";
import { resolveOrgSecrets } from "../org/integrations";

export type MandateDecision = {
  allow: boolean;
  reason: string;
  source: "serv" | "agentrouter" | "policy";
};

type MandateInput = {
  amountDollars: number;
  network: string;
  asset: string;
  vaultId: string;
  mandateLimitCents: number;
  mandateUsedCents: number;
  mandateStatus: string;
  orgId?: string;
};

function policyCheck(input: MandateInput): MandateDecision | null {
  if (input.mandateStatus !== "active") {
    return { allow: false, reason: "Mandate is not active.", source: "policy" };
  }
  if (input.amountDollars < 100) {
    return { allow: false, reason: "Minimum deposit is $100 USDC.", source: "policy" };
  }
  if (
    input.network.toLowerCase() !== "avalanche" &&
    !input.network.toLowerCase().includes("avalanche") &&
    input.network.toLowerCase() !== "bnb" &&
    !input.network.toLowerCase().includes("bnb") &&
    !input.network.toLowerCase().includes("bsc")
  ) {
    return {
      allow: false,
      reason: "Primary deposit path requires Avalanche or BNB Chain.",
      source: "policy",
    };
  }
  if (input.asset.toUpperCase() !== "USDC") {
    return { allow: false, reason: "Only USDC is permitted.", source: "policy" };
  }
  const remaining = input.mandateLimitCents - input.mandateUsedCents;
  if (input.amountDollars * 100 > remaining) {
    return {
      allow: false,
      reason: `Amount exceeds remaining mandate capacity ($${(remaining / 100).toFixed(2)}).`,
      source: "policy",
    };
  }
  return null;
}

async function openservDecide(
  input: MandateInput,
  apiKey: string | null,
): Promise<MandateDecision | null> {
  if (!apiKey) return null;
  const base = (
    process.env.OPENSERV_API_BASE_URL ?? "https://inference-api.openserv.ai"
  ).replace(/\/$/, "");

  const chatBase = base.endsWith("/v1") ? base : `${base}/v1`;
  const res = await fetch(`${chatBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENSERV_MODEL ?? "gpt-5.4-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are SERV mandate reasoning for BOND RWA vaults. Reply with exactly this JSON shape and no other keys: {"allow":true,"reason":"..."} or {"allow":false,"reason":"..."}. Use the key "allow" (boolean), never "approved". Allow only if amount ≥ 100 USDC, network is Avalanche or BNB Chain (or BSC), asset USDC, mandate active, and within remaining mandate capacity. Never invent extra capacity.',
        },
        {
          role: "user",
          content: JSON.stringify({
            amountUsd: input.amountDollars,
            network: input.network,
            asset: input.asset,
            vaultId: input.vaultId,
            monthlyLimitCents: input.mandateLimitCents,
            usedCents: input.mandateUsedCents,
            mandateStatus: input.mandateStatus,
          }),
        },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 404 || res.status === 501) return null;
    throw new Error(`OpenServ SERV gate failed (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    allow?: boolean;
    reason?: string;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (content) {
    const raw = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(raw) as {
      allow?: boolean;
      approved?: boolean;
      reason?: string;
    };
    const allow =
      typeof parsed.allow === "boolean"
        ? parsed.allow
        : typeof parsed.approved === "boolean"
          ? parsed.approved
          : undefined;
    if (typeof allow === "boolean") {
      return { allow, reason: parsed.reason ?? "", source: "serv" };
    }
  }
  if (typeof data.allow === "boolean") {
    return { allow: data.allow, reason: data.reason ?? "", source: "serv" };
  }
  throw new Error("OpenServ SERV gate returned an unusable response.");
}

async function agentRouterDecide(
  input: MandateInput,
  apiKey: string | null,
): Promise<MandateDecision> {
  if (!apiKey) {
    throw new Error(
      "Connect your own SERV or AgentRouter key in Settings → Integrations (or enable platform fallback).",
    );
  }
  const text = await agentRouterChat(
    [
      {
        role: "system",
        content:
          'You are SERV mandate reasoning for BOND. Decide allow/deny for an RWA vault subscription. Return JSON only: {"allow":boolean,"reason":string}. Deny if amount < 100, not Avalanche, not USDC, mandate inactive, or over remaining limit. Never invent extra capacity.',
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    { temperature: 0, responseFormat: "json_object", apiKey },
  );
  const parsed = JSON.parse(text) as { allow: boolean; reason: string };
  if (typeof parsed.allow !== "boolean") {
    throw new Error("AgentRouter mandate decision missing allow.");
  }
  return { allow: parsed.allow, reason: parsed.reason ?? "", source: "agentrouter" };
}

/**
 * Hard gate: policy failures deny immediately.
 * Then org/platform SERV → AgentRouter. Deny never soft-passes.
 */
export async function evaluateMandate(input: MandateInput): Promise<MandateDecision> {
  const policy = policyCheck(input);
  if (policy && !policy.allow) return policy;

  let openservKey = process.env.OPENSERV_API_KEY ?? null;
  let agentrouterKey = process.env.AGENTROUTER_API_KEY ?? null;
  if (input.orgId) {
    const secrets = await resolveOrgSecrets(input.orgId);
    openservKey = secrets.openservApiKey;
    agentrouterKey = secrets.agentrouterApiKey;
  }

  try {
    const serv = await openservDecide(input, openservKey);
    if (serv) return serv;
  } catch (err) {
    console.warn("[mandate] OpenServ gate error, trying AgentRouter:", err);
  }

  return agentRouterDecide(input, agentrouterKey);
}
