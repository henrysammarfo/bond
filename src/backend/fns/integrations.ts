import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "../auth/session";
import {
  ensureOrgAgentWallet,
  getIntegrationsPublic,
  saveOrgIntegrations,
} from "../org/integrations";
import { getWalletBalances } from "../agentkit/wallet";

export const getIntegrationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  await ensureOrgAgentWallet(auth.orgId);
  const pub = await getIntegrationsPublic(auth.orgId);
  let balances: { usdc: string; avax: string } | null = null;
  if (pub.agentWalletAddress?.startsWith("0x")) {
    try {
      const b = await getWalletBalances(pub.agentWalletAddress as `0x${string}`);
      balances = { usdc: b.usdc, avax: b.avax };
    } catch {
      balances = null;
    }
  }
  return { ...pub, balances };
});

export const saveIntegrationsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      openservApiKey: z.string().optional().nullable(),
      agentrouterApiKey: z.string().optional().nullable(),
      tavilyApiKey: z.string().optional().nullable(),
      tinyfishApiKey: z.string().optional().nullable(),
      agentPrivateKey: z.string().optional().nullable(),
      usePlatformFallback: z.boolean().optional(),
      clearOpenserv: z.boolean().optional(),
      clearAgentrouter: z.boolean().optional(),
      rotateAgentWallet: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    return saveOrgIntegrations(auth.orgId, {
      openservApiKey: data.openservApiKey,
      agentrouterApiKey: data.agentrouterApiKey,
      tavilyApiKey: data.tavilyApiKey,
      tinyfishApiKey: data.tinyfishApiKey,
      agentPrivateKey: data.agentPrivateKey,
      usePlatformFallback: data.usePlatformFallback,
      clearOpenserv: data.clearOpenserv,
      clearAgentrouter: data.clearAgentrouter,
      clearAgentKey: data.rotateAgentWallet,
    });
  });

export const rotateAgentWalletFn = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await requireAuth();
  return saveOrgIntegrations(auth.orgId, { clearAgentKey: true });
});
