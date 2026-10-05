import { describe, expect, test } from "bun:test";
import { normalizePosition } from "./client";

describe("normalizePosition", () => {
  test("flattens nested IXS position balances", () => {
    const pos = normalizePosition({
      position: {
        balances: {
          shares: { baseUnits: "96045510795884819268", display: "96.04 shares" },
          asset: { baseUnits: "0", display: "0.0 USDC" },
          shareValueInAssets: { baseUnits: "102858307013169317153", display: "102.85 USDC" },
        },
        limits: {
          maxRedeem: { baseUnits: "0", display: "0.0 shares" },
          maxWithdraw: { baseUnits: "0", display: "0.0 USDC" },
        },
      },
    });
    expect(pos.shareBalance).toBe("96045510795884819268");
    expect(pos.maxRedeem).toBe("0");
    expect(pos.shareValueInAssets).toBe("102858307013169317153");
  });

  test("keeps flat payloads", () => {
    const pos = normalizePosition({ shareBalance: "12", maxRedeem: "3" });
    expect(pos.shareBalance).toBe("12");
    expect(pos.maxRedeem).toBe("3");
  });
});
