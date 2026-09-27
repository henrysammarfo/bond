import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "../auth/session";
import { ensureOrgAgentWallet } from "../org/integrations";
import { getWalletAddress } from "../agentkit/wallet";
import { runAllocationScan } from "../serv/allocate";
import { runVaultPreflight, LIVE_REDEEMABLE_MIN_USD } from "../ixs/preflight";
import { simulateDeposit } from "../ixs/simulate";
import { getEvidenceBundle } from "../evidence/store";
import { getVault } from "../ixs/client";

export const scanVaultsFn = createServerFn({ method: "POST" })
  .validator(z.object({ vaultIds: z.array(z.string()).optional() }).optional())
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    await ensureOrgAgentWallet(auth.orgId);
    const wallet = await getWalletAddress(auth.orgId);
    return runAllocationScan({
      wallet,
      orgId: auth.orgId,
      vaultIds: data?.vaultIds,
    });
  });

export const preflightVaultFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      vaultId: z.string().min(8),
      amountUsd: z.number().min(1).optional(),
      live: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    await ensureOrgAgentWallet(auth.orgId);
    const wallet = await getWalletAddress(auth.orgId);
    return runVaultPreflight({
      vaultId: data.vaultId,
      wallet,
      amountUsd: data.amountUsd ?? LIVE_REDEEMABLE_MIN_USD,
      live: data.live ?? true,
    });
  });

export const simulateVaultDepositFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      vaultId: z.string().min(8),
      amountUsd: z.number().min(LIVE_REDEEMABLE_MIN_USD),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    await ensureOrgAgentWallet(auth.orgId);
    const wallet = await getWalletAddress(auth.orgId);
    const vault = await getVault(data.vaultId);
    const decimals = vault.underlyingAsset.decimals ?? (vault.chainId === 56 ? 18 : 6);
    const assetAmount = BigInt(Math.round(data.amountUsd * 10 ** decimals)).toString();
    return simulateDeposit({
      vaultId: data.vaultId,
      ownerAddress: wallet,
      assetAmount,
    });
  });

/** Public evidence — no auth. Durable on Neon. */
export const getPublicEvidenceFn = createServerFn({ method: "GET" }).handler(async () => {
  return await getEvidenceBundle();
});
