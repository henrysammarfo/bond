import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getVault,
  listVaults,
  primaryVaultId,
  secondaryBnbVaultId,
  vaultToPublicCard,
  getPosition,
} from "../ixs/client";
import { vaultGetMcp } from "../ixs/mcp";
import { requireAuth } from "../auth/session";
import { getWalletAddress } from "../agentkit/wallet";
import { ensureOrgAgentWallet } from "../org/integrations";

export const listLiveVaultsFn = createServerFn({ method: "GET" }).handler(async () => {
  const all = await listVaults();
  // Surface the full live IXS catalog — permissionless deposit lanes first, then whitelist browse.
  const cards = all
    .map(vaultToPublicCard)
    .sort((a, b) => {
      const rank = (r: string) =>
        r === "primary" ? 0 : r === "secondary" ? 1 : r === "whitelist" ? 2 : 3;
      return rank(a.role) - rank(b.role);
    });
  return {
    primaryVaultId: primaryVaultId(),
    bnbVaultId: secondaryBnbVaultId(),
    vaults: cards,
  };
});

export const getLiveVaultFn = createServerFn({ method: "GET" })
  .validator(z.object({ vaultId: z.string().min(8) }))
  .handler(async ({ data }) => {
    const vault = await getVault(data.vaultId);
    const card = vaultToPublicCard(vault);
    let mcp: Record<string, unknown> | null = null;
    try {
      mcp = await vaultGetMcp(data.vaultId);
    } catch {
      mcp = null;
    }
    return { ...card, settlement: mcp?.settlement ?? null, mcp };
  });

/** Live dual-chain position probe for the org AgentKit address. */
export const getOrgVaultPositionsFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  await ensureOrgAgentWallet(auth.orgId);
  const address = await getWalletAddress(auth.orgId);
  const [avax, bnb] = await Promise.all([
    getPosition(primaryVaultId(), address).catch((e) => ({
      error: e instanceof Error ? e.message : "read_failed",
    })),
    getPosition(secondaryBnbVaultId(), address).catch((e) => ({
      error: e instanceof Error ? e.message : "read_failed",
    })),
  ]);
  return {
    address,
    avalanche: { vaultId: primaryVaultId(), position: avax },
    bnb: { vaultId: secondaryBnbVaultId(), position: bnb },
  };
});
