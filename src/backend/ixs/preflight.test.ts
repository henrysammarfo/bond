import { describe, expect, test } from "bun:test";
import { liveRedeemableMinimumUsd, MAX_VAULT_TVL_SHARE_PCT } from "./preflight";

describe("IXS preflight guardrails", () => {
  test("live redeemable floor is 104 USDC for 100 min + 50bps + 3% buffer", () => {
    expect(liveRedeemableMinimumUsd(100, 50, 3)).toBe(104);
  });

  test("TVL share policy is 25%", () => {
    expect(MAX_VAULT_TVL_SHARE_PCT).toBe(25);
  });
});
