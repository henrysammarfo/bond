/**
 * Per-org integration vault: encrypt BYO keys + AgentKit signer.
 * Resolve order: org sealed secret → platform env (if usePlatformFallback).
 */
import { eq } from "drizzle-orm";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { getDb } from "../db/client";
import { orgIntegrations } from "../db/schema";
import { maskSecret, openSecret, sealSecret } from "../crypto/secretBox";

export type OrgRuntimeSecrets = {
  orgId: string;
  agentPrivateKey: Hex | null;
  agentWalletAddress: `0x${string}` | null;
  openservApiKey: string | null;
  agentrouterApiKey: string | null;
  tavilyApiKey: string | null;
  tinyfishApiKey: string | null;
  sources: {
    agent: "org" | "platform" | "none";
    openserv: "org" | "platform" | "none";
    agentrouter: "org" | "platform" | "none";
  };
  usePlatformFallback: boolean;
};

export type OrgIntegrationsPublic = {
  agentWalletAddress: string | null;
  hasAgentKey: boolean;
  hasOpenserv: boolean;
  hasAgentrouter: boolean;
  hasTavily: boolean;
  hasTinyfish: boolean;
  openservMasked: string | null;
  agentrouterMasked: string | null;
  usePlatformFallback: boolean;
  sources: OrgRuntimeSecrets["sources"];
};

async function loadRow(orgId: string) {
  const db = getDb();
  const rows = await db.select().from(orgIntegrations).where(eq(orgIntegrations.orgId, orgId)).limit(1);
  return rows[0] ?? null;
}

function tryOpen(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    return openSecret(enc);
  } catch {
    return null;
  }
}

/** Ensure org has an AgentKit-compatible EVM key (generate once). Returns address. */
export async function ensureOrgAgentWallet(orgId: string): Promise<`0x${string}`> {
  const existing = await loadRow(orgId);
  if (existing?.agentWalletAddress?.startsWith("0x") && existing.agentPrivateKeyEnc) {
    return existing.agentWalletAddress as `0x${string}`;
  }

  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  const db = getDb();
  const enc = sealSecret(pk);

  if (existing) {
    await db
      .update(orgIntegrations)
      .set({
        agentWalletAddress: account.address,
        agentPrivateKeyEnc: enc,
        updatedAt: new Date(),
      })
      .where(eq(orgIntegrations.orgId, orgId));
  } else {
    await db.insert(orgIntegrations).values({
      orgId,
      agentWalletAddress: account.address,
      agentPrivateKeyEnc: enc,
      usePlatformFallback: true,
    });
  }
  return account.address;
}

export async function resolveOrgSecrets(orgId: string): Promise<OrgRuntimeSecrets> {
  const row = await loadRow(orgId);
  const fallback = row?.usePlatformFallback !== false;

  const orgPk = tryOpen(row?.agentPrivateKeyEnc);
  const platformPk = process.env.AGENT_PRIVATE_KEY ?? process.env.CDP_WALLET_PRIVATE_KEY ?? null;
  let agentPrivateKey: Hex | null = null;
  let agentWalletAddress: `0x${string}` | null = null;
  let agentSource: OrgRuntimeSecrets["sources"]["agent"] = "none";

  if (orgPk) {
    const key = (orgPk.startsWith("0x") ? orgPk : `0x${orgPk}`) as Hex;
    agentPrivateKey = key;
    agentWalletAddress = (row?.agentWalletAddress as `0x${string}`) ?? privateKeyToAccount(key).address;
    agentSource = "org";
  } else if (fallback && platformPk) {
    const key = (platformPk.startsWith("0x") ? platformPk : `0x${platformPk}`) as Hex;
    agentPrivateKey = key;
    agentWalletAddress = process.env.CDP_WALLET_ADDRESS?.startsWith("0x")
      ? (process.env.CDP_WALLET_ADDRESS as `0x${string}`)
      : privateKeyToAccount(key).address;
    agentSource = "platform";
  }

  const orgServ = tryOpen(row?.openservApiKeyEnc);
  const orgAr = tryOpen(row?.agentrouterApiKeyEnc);
  const openservApiKey = orgServ || (fallback ? process.env.OPENSERV_API_KEY ?? null : null);
  const agentrouterApiKey = orgAr || (fallback ? process.env.AGENTROUTER_API_KEY ?? null : null);

  return {
    orgId,
    agentPrivateKey,
    agentWalletAddress,
    openservApiKey,
    agentrouterApiKey,
    tavilyApiKey: tryOpen(row?.tavilyApiKeyEnc) || (fallback ? process.env.TAVILY_API_KEY ?? null : null),
    tinyfishApiKey:
      tryOpen(row?.tinyfishApiKeyEnc) || (fallback ? process.env.TINYFISH_API_KEY ?? null : null),
    sources: {
      agent: agentSource,
      openserv: orgServ ? "org" : openservApiKey ? "platform" : "none",
      agentrouter: orgAr ? "org" : agentrouterApiKey ? "platform" : "none",
    },
    usePlatformFallback: fallback,
  };
}

export async function getIntegrationsPublic(orgId: string): Promise<OrgIntegrationsPublic> {
  await ensureOrgAgentWallet(orgId);
  const secrets = await resolveOrgSecrets(orgId);
  const row = await loadRow(orgId);
  return {
    agentWalletAddress: secrets.agentWalletAddress,
    hasAgentKey: Boolean(row?.agentPrivateKeyEnc),
    hasOpenserv: Boolean(row?.openservApiKeyEnc),
    hasAgentrouter: Boolean(row?.agentrouterApiKeyEnc),
    hasTavily: Boolean(row?.tavilyApiKeyEnc),
    hasTinyfish: Boolean(row?.tinyfishApiKeyEnc),
    openservMasked: row?.openservApiKeyEnc ? maskSecret(tryOpen(row.openservApiKeyEnc)) : null,
    agentrouterMasked: row?.agentrouterApiKeyEnc
      ? maskSecret(tryOpen(row.agentrouterApiKeyEnc))
      : null,
    usePlatformFallback: secrets.usePlatformFallback,
    sources: secrets.sources,
  };
}

export type SaveIntegrationsInput = {
  openservApiKey?: string | null;
  agentrouterApiKey?: string | null;
  tavilyApiKey?: string | null;
  tinyfishApiKey?: string | null;
  agentPrivateKey?: string | null;
  usePlatformFallback?: boolean;
  clearOpenserv?: boolean;
  clearAgentrouter?: boolean;
  clearAgentKey?: boolean;
};

export async function saveOrgIntegrations(orgId: string, input: SaveIntegrationsInput) {
  await ensureOrgAgentWallet(orgId);
  const db = getDb();
  const row = await loadRow(orgId);
  const patch: Partial<typeof orgIntegrations.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (typeof input.usePlatformFallback === "boolean") {
    patch.usePlatformFallback = input.usePlatformFallback;
  }
  if (input.clearOpenserv) patch.openservApiKeyEnc = null;
  else if (input.openservApiKey?.trim()) patch.openservApiKeyEnc = sealSecret(input.openservApiKey.trim());

  if (input.clearAgentrouter) patch.agentrouterApiKeyEnc = null;
  else if (input.agentrouterApiKey?.trim()) {
    patch.agentrouterApiKeyEnc = sealSecret(input.agentrouterApiKey.trim());
  }

  if (input.tavilyApiKey?.trim()) patch.tavilyApiKeyEnc = sealSecret(input.tavilyApiKey.trim());
  if (input.tinyfishApiKey?.trim()) patch.tinyfishApiKeyEnc = sealSecret(input.tinyfishApiKey.trim());

  if (input.clearAgentKey) {
    // regenerate fresh wallet rather than leave org without signer
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    patch.agentPrivateKeyEnc = sealSecret(pk);
    patch.agentWalletAddress = account.address;
  } else if (input.agentPrivateKey?.trim()) {
    const raw = input.agentPrivateKey.trim();
    const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
    const account = privateKeyToAccount(key);
    patch.agentPrivateKeyEnc = sealSecret(key);
    patch.agentWalletAddress = account.address;
  }

  if (!row) {
    await db.insert(orgIntegrations).values({
      orgId,
      usePlatformFallback: input.usePlatformFallback ?? true,
      ...patch,
    });
  } else {
    await db.update(orgIntegrations).set(patch).where(eq(orgIntegrations.orgId, orgId));
  }

  return getIntegrationsPublic(orgId);
}
