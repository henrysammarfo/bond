import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getVault, listVaults, primaryVaultId, vaultToPublicCard } from "../ixs/client";

const SECONDARY_BNB_VAULT_ID = "6a26624ca7d16b245d665475";

export const listLiveVaultsFn = createServerFn({ method: "GET" }).handler(async () => {
  const all = await listVaults();
  const allowed = new Set([primaryVaultId(), SECONDARY_BNB_VAULT_ID]);
  const curated = all.filter((v) => allowed.has(v.id));
  const cards = (curated.length ? curated : all.filter((v) => v.chainId === 43114)).map(
    vaultToPublicCard,
  );
  return {
    primaryVaultId: primaryVaultId(),
    vaults: cards,
  };
});

export const getLiveVaultFn = createServerFn({ method: "GET" })
  .validator(z.object({ vaultId: z.string().min(8) }))
  .handler(async ({ data }) => {
    const vault = await getVault(data.vaultId);
    return vaultToPublicCard(vault);
  });
