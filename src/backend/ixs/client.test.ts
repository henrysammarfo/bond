/**
 * Live IXS smoke — run: bun test src/backend/ixs/client.test.ts
 */
import { describe, expect, test } from "bun:test";
import { getVault, listVaults, primaryVaultId } from "./client";

describe("IXS live reads", () => {
  test("lists vaults and resolves primary Avalanche vault", async () => {
    const vaults = await listVaults();
    expect(vaults.length).toBeGreaterThan(0);
    const primary = await getVault(primaryVaultId());
    expect(primary.contractAddress.toLowerCase()).toBe(
      "0xaD01573b459805E3954398796203d830B57A8bD9".toLowerCase(),
    );
    expect(primary.chainId).toBe(43114);
    expect(primary.requiresWhitelist).toBe(false);
  }, 30_000);
});
