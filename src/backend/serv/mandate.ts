import { agentRouterChat } from "../llm/agentrouter";

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
    !input.network.toLowerCase().includes("avalanche")
  ) {
    return { allow: false, reason: "Primary deposit path requires Avalanche.", source: "policy" };
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

async function openservDecide(input: MandateInput): Promise<MandateDecision | null> {
  const key = process.env.OPENSERV_API_KEY;
  const base = process.env.OPENSERV_API_BASE_URL ?? "https://api.openserv.ai";
  if (!key) return null;
  const res = await fetch(`${base}/v1/reasoning/mandate-gate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      task: "mandate_gate",
      mandate: {
        amountUsd: input.amountDollars,
        network: input.network,
        asset: input.asset,
        vaultId: input.vaultId,
        monthlyLimitCents: input.mandateLimitCents,
        usedCents: input.mandateUsedCents,
      },
      instruction:
        "Allow only if amount ≥ 100 USDC, network Avalanche, asset USDC, and within remaining mandate. Reply JSON {allow:boolean,reason:string}.",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 404 || res.status === 501) return null;
    throw new Error(`OpenServ SERV gate failed (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as { allow?: boolean; reason?: string; result?: MandateDecision };
  if (typeof data.allow === "boolean") {
    return { allow: data.allow, reason: data.reason ?? "", source: "serv" };
  }
  if (data.result && typeof data.result.allow === "boolean") {
    return { ...data.result, source: "serv" };
  }
  throw new Error("OpenServ SERV gate returned an unusable response.");
}

async function agentRouterDecide(input: MandateInput): Promise<MandateDecision> {
  if (!process.env.AGENTROUTER_API_KEY) {
    throw new Error(
      "AGENTROUTER_API_KEY (or working OPENSERV_API_KEY) required for SERV mandate reasoning.",
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
    { temperature: 0, responseFormat: "json_object" },
  );
  const parsed = JSON.parse(text) as { allow: boolean; reason: string };
  if (typeof parsed.allow !== "boolean") {
    throw new Error("AgentRouter mandate decision missing allow.");
  }
  return { allow: parsed.allow, reason: parsed.reason ?? "", source: "agentrouter" };
}

/**
 * Hard gate: policy failures deny immediately.
 * Then SERV (OpenServ) if configured; else AgentRouter reasoning (Tor on cloud).
 * Deny never soft-passes.
 */
export async function evaluateMandate(input: MandateInput): Promise<MandateDecision> {
  const policy = policyCheck(input);
  if (policy && !policy.allow) return policy;

  try {
    const serv = await openservDecide(input);
    if (serv) return serv;
  } catch (err) {
    console.warn("[mandate] OpenServ gate error, trying AgentRouter:", err);
  }

  return agentRouterDecide(input);
}
