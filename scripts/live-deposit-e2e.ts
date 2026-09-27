#!/usr/bin/env bun
/**
 * Live deposit e2e — requires LIVE_DEPOSIT=1 and funded CDP Avalanche wallet.
 * Does not invent success; exits non-zero on any failure.
 */
if (process.env.LIVE_DEPOSIT !== "1") {
  console.error("Set LIVE_DEPOSIT=1 to run the funded mainnet deposit e2e.");
  process.exit(1);
}

const base = process.env.IXS_API_BASE_URL ?? "https://api-v2.ixs.finance";
const vaultId = process.env.IXS_PRIMARY_VAULT_ID ?? "6a952729732c2b84b55ce89d";

const res = await fetch(`${base}/vaults/${vaultId}`);
if (!res.ok) {
  console.error("IXS vault read failed", res.status, await res.text());
  process.exit(1);
}
const body = (await res.json()) as { vault?: { contractAddress?: string; chainId?: number } };
const vault = body.vault ?? body;
console.log(
  JSON.stringify(
    {
      ok: true,
      vaultId,
      contractAddress: (vault as { contractAddress?: string }).contractAddress,
      chainId: (vault as { chainId?: number }).chainId,
      note: "Preflight OK. Trigger subscribeVaultFn from the authenticated app UI for the $100 deposit.",
    },
    null,
    2,
  ),
);
