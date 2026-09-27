/**
 * Multi-vault SERV allocation: ALLOCATE / DEFER / REJECT with reasons.
 * Deterministic preflight facts first; SERV narrates; policy clamps amount.
 */
import { agentRouterChat } from "../llm/agentrouter";
import { resolveOrgSecrets } from "../org/integrations";
import { recordEvidence, setLastScanEvidence } from "../evidence/store";
import {
  runCatalogPreflight,
  LIVE_REDEEMABLE_MIN_USD,
  IXS_MIN_DEPOSIT_USD,
  type VaultPreflight,
} from "../ixs/preflight";
import type { Address } from "viem";

export type VaultVerdict = {
  vaultId: string;
  name: string;
  network: string;
  chainId: number;
  verdict: "ALLOCATE" | "DEFER" | "REJECT";
  amountUsd: number | null;
  reason: string;
  preflight: VaultPreflight;
};

export type AllocationScan = {
  wallet: Address;
  checkedAt: string;
  source: "serv" | "agentrouter" | "policy";
  servInput: unknown;
  servOutput: unknown;
  verdicts: VaultVerdict[];
  memo: string;
};

function clampAmount(pre: VaultPreflight, proposed: number | null): number | null {
  if (pre.verdict !== "allocate") return null;
  let amt = proposed ?? pre.suggestedMaxUsd ?? LIVE_REDEEMABLE_MIN_USD;
  if (pre.tvlCapUsd != null) amt = Math.min(amt, pre.tvlCapUsd);
  if (pre.depositLimitUsd != null && !pre.depositLimitUnlimited) {
    amt = Math.min(amt, pre.depositLimitUsd);
  }
  amt = Math.max(amt, LIVE_REDEEMABLE_MIN_USD);
  if (pre.tvlCapUsd != null && pre.tvlCapUsd < IXS_MIN_DEPOSIT_USD) return null;
  return Math.floor(amt * 100) / 100;
}

function policyVerdicts(results: VaultPreflight[]): VaultVerdict[] {
  return results.map((pre) => {
    if (pre.verdict === "reject") {
      const reason =
        pre.checks.find((c) => !c.ok && c.severity === "block")?.detail ?? "Blocked";
      return {
        vaultId: pre.vaultId,
        name: pre.name,
        network: pre.network,
        chainId: pre.chainId,
        verdict: "REJECT" as const,
        amountUsd: null,
        reason,
        preflight: pre,
      };
    }
    if (pre.verdict === "defer") {
      const reason =
        pre.checks.find((c) => !c.ok && c.severity === "defer")?.detail ?? "Deferred";
      return {
        vaultId: pre.vaultId,
        name: pre.name,
        network: pre.network,
        chainId: pre.chainId,
        verdict: "DEFER" as const,
        amountUsd: null,
        reason,
        preflight: pre,
      };
    }
    const amountUsd = clampAmount(pre, pre.suggestedMaxUsd);
    return {
      vaultId: pre.vaultId,
      name: pre.name,
      network: pre.network,
      chainId: pre.chainId,
      verdict: "ALLOCATE" as const,
      amountUsd,
      reason: `Preflight clear. Cap at ${amountUsd} USDC (≤25% TVL, redeemable min ${LIVE_REDEEMABLE_MIN_USD}).`,
      preflight: pre,
    };
  });
}

async function servDecide(
  facts: VaultPreflight[],
  apiKey: string | null,
): Promise<{ verdicts: Array<{ vaultId: string; verdict: string; amountUsd: number | null; reason: string }>; raw: unknown } | null> {
  if (!apiKey) return null;
  const base = (process.env.OPENSERV_API_BASE_URL ?? "https://inference-api.openserv.ai").replace(
    /\/$/,
    "",
  );
  const chatBase = base.endsWith("/v1") ? base : `${base}/v1`;
  const payload = {
    model: process.env.OPENSERV_MODEL ?? "gpt-5.4-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'You are SERV treasury reasoning for BOND RWA vaults. Given preflight facts per vault, return JSON: {"verdicts":[{"vaultId":"...","verdict":"ALLOCATE"|"DEFER"|"REJECT","amountUsd":number|null,"reason":"..."}]}. ALLOCATE only when preflight.verdict is allocate. Cap amountUsd at suggestedMaxUsd / tvlCapUsd and never below 104 USDC for live-safe size. Cite the failing check in DEFER/REJECT reasons. Never invent vault ids.',
      },
      {
        role: "user",
        content: JSON.stringify({
          doctrine: "Pending is not ownership. Live deposits need AgentKit + preflight ALLOCATE.",
          vaults: facts.map((f) => ({
            vaultId: f.vaultId,
            name: f.name,
            network: f.network,
            chainId: f.chainId,
            preflightVerdict: f.verdict,
            depositLimitUsd: f.depositLimitUsd,
            totalAssetsUsd: f.totalAssetsUsd,
            tvlCapUsd: f.tvlCapUsd,
            suggestedMaxUsd: f.suggestedMaxUsd,
            navAgeHours: f.navAgeHours,
            liveRedeemableMinUsd: f.liveRedeemableMinUsd,
            checks: f.checks.map((c) => ({
              key: c.key,
              ok: c.ok,
              severity: c.severity,
              value: c.value,
              detail: c.detail,
            })),
          })),
        }),
      },
    ],
  };
  const res = await fetch(`${chatBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SERV allocate failed (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("SERV allocate returned empty content.");
  const raw = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(raw) as {
    verdicts?: Array<{
      vaultId: string;
      verdict: string;
      amountUsd?: number | null;
      reason?: string;
    }>;
  };
  return { verdicts: parsed.verdicts ?? [], raw: parsed };
}

export async function runAllocationScan(params: {
  wallet: Address;
  orgId?: string;
  vaultIds?: string[];
}): Promise<AllocationScan> {
  const catalog = await runCatalogPreflight({
    wallet: params.wallet,
    vaultIds: params.vaultIds,
    amountUsd: LIVE_REDEEMABLE_MIN_USD,
    live: true,
  });

  for (const pre of catalog.results) {
    recordEvidence({
      kind: "preflight",
      label: `${pre.name} · ${pre.network} · ${pre.verdict}`,
      chainId: pre.chainId,
      blockNumber: pre.blockNumber,
      request: { vaultId: pre.vaultId, wallet: params.wallet },
      response: {
        verdict: pre.verdict,
        depositLimitUsd: pre.depositLimitUsd,
        totalAssetsUsd: pre.totalAssetsUsd,
        tvlCapUsd: pre.tvlCapUsd,
        navAgeHours: pre.navAgeHours,
        checks: pre.checks,
      },
      ok: pre.ok,
    });
  }

  let openservKey = process.env.OPENSERV_API_KEY ?? null;
  let agentrouterKey = process.env.AGENTROUTER_API_KEY ?? null;
  if (params.orgId) {
    const secrets = await resolveOrgSecrets(params.orgId);
    openservKey = secrets.openservApiKey;
    agentrouterKey = secrets.agentrouterApiKey;
  }

  const servInput = {
    vaultCount: catalog.results.length,
    wallet: params.wallet,
    checkedAt: catalog.checkedAt,
  };

  let source: AllocationScan["source"] = "policy";
  let servOutput: unknown = null;
  let merged = policyVerdicts(catalog.results);

  try {
    const serv = await servDecide(catalog.results, openservKey);
    if (serv) {
      source = "serv";
      servOutput = serv.raw;
      const byId = new Map(catalog.results.map((r) => [r.vaultId, r]));
      merged = catalog.results.map((pre) => {
        const hit = serv.verdicts.find((v) => v.vaultId === pre.vaultId);
        const policy = policyVerdicts([pre])[0]!;
        if (!hit) return policy;
        // Deterministic clamp — SERV cannot override REJECT/DEFER from preflight.
        if (pre.verdict === "reject") return { ...policy, verdict: "REJECT" as const };
        if (pre.verdict === "defer") return { ...policy, verdict: "DEFER" as const };
        const v = String(hit.verdict).toUpperCase();
        if (v === "ALLOCATE") {
          return {
            ...policy,
            verdict: "ALLOCATE" as const,
            amountUsd: clampAmount(pre, hit.amountUsd ?? policy.amountUsd),
            reason: hit.reason ?? policy.reason,
            preflight: pre,
          };
        }
        if (v === "DEFER") {
          return {
            ...policy,
            verdict: "DEFER" as const,
            amountUsd: null,
            reason: hit.reason ?? policy.reason,
            preflight: byId.get(pre.vaultId)!,
          };
        }
        return {
          ...policy,
          verdict: "REJECT" as const,
          amountUsd: null,
          reason: hit.reason ?? policy.reason,
          preflight: pre,
        };
      });
      recordEvidence({
        kind: "serv",
        label: "SERV multi-vault verdicts",
        request: servInput,
        response: serv.raw,
        ok: true,
      });
    }
  } catch (err) {
    recordEvidence({
      kind: "serv",
      label: "SERV allocate error — policy fallback",
      request: servInput,
      response: { error: err instanceof Error ? err.message : String(err) },
      ok: false,
    });
    if (agentrouterKey) {
      try {
        const text = await agentRouterChat(
          [
            {
              role: "system",
              content:
                'Return JSON {"verdicts":[{"vaultId":"...","verdict":"ALLOCATE"|"DEFER"|"REJECT","amountUsd":number|null,"reason":"..."}]}. Respect preflight.verdict.',
            },
            {
              role: "user",
              content: JSON.stringify(
                catalog.results.map((f) => ({
                  vaultId: f.vaultId,
                  preflightVerdict: f.verdict,
                  suggestedMaxUsd: f.suggestedMaxUsd,
                  checks: f.checks.filter((c) => !c.ok),
                })),
              ),
            },
          ],
          { temperature: 0, responseFormat: "json_object", apiKey: agentrouterKey },
        );
        source = "agentrouter";
        servOutput = JSON.parse(text);
        recordEvidence({
          kind: "serv",
          label: "AgentRouter multi-vault verdicts",
          request: servInput,
          response: servOutput,
          ok: true,
        });
      } catch {
        /* keep policy */
      }
    }
  }

  const allocate = merged.filter((v) => v.verdict === "ALLOCATE");
  const defer = merged.filter((v) => v.verdict === "DEFER");
  const reject = merged.filter((v) => v.verdict === "REJECT");
  const memo = [
    `BOND scanned ${merged.length} live IXS vaults for ${params.wallet}.`,
    allocate.length
      ? `ALLOCATE: ${allocate.map((a) => `${a.name} (${a.network}) @ ${a.amountUsd} USDC`).join("; ")}.`
      : "ALLOCATE: none this run.",
    defer.length
      ? `DEFER: ${defer.map((d) => `${d.name} — ${d.reason}`).join("; ")}.`
      : "",
    reject.length
      ? `REJECT: ${reject.map((r) => `${r.name} — ${r.reason}`).join("; ")}.`
      : "",
    "Live deposits stay Pending until IXS shares prove. Guardrails: ≥104 USDC redeemable floor, ≤25% vault TVL, whitelist + NAV/limit checks.",
  ]
    .filter(Boolean)
    .join(" ");

  const scan: AllocationScan = {
    wallet: params.wallet,
    checkedAt: catalog.checkedAt,
    source,
    servInput,
    servOutput,
    verdicts: merged,
    memo,
  };
  setLastScanEvidence(scan);
  return scan;
}
