/**
 * Unit tests for Pending / Finalized accounting — run: bun test src/lib/status.test.ts
 */
import { describe, expect, test } from "bun:test";
import {
  assertNotEarningLabel,
  displayShares,
  dollarsToCents,
  ownedValueCents,
  usdcToBaseUnits,
} from "./status";

describe("status machine", () => {
  test("Pending is not owned and not earning", () => {
    expect(ownedValueCents("Pending", 10000)).toBe(0);
    expect(displayShares("Pending", "99.14")).toBe("—");
    expect(assertNotEarningLabel("Pending")).toContain("not earning");
  });

  test("Finalized shows shares and owned value", () => {
    expect(ownedValueCents("Finalized", 10000)).toBe(10000);
    expect(displayShares("Finalized", "99.14")).toBe("99.14");
  });

  test("RedeemPending stays owned until withdrawn", () => {
    expect(ownedValueCents("RedeemPending", 10400)).toBe(10400);
    expect(assertNotEarningLabel("RedeemPending")).toContain("queued");
  });

  test("Withdrawn is not owned", () => {
    expect(ownedValueCents("Withdrawn", 10400)).toBe(0);
    expect(displayShares("Withdrawn", "99")).toBe("—");
  });

  test("USDC base units use 6 decimals by default", () => {
    expect(usdcToBaseUnits(100)).toBe(100_000_000n);
    expect(dollarsToCents(100)).toBe(10000);
  });

  test("USDC base units honor BSC 18 decimals without float loss", () => {
    expect(usdcToBaseUnits(100, 18)).toBe(100_000_000_000_000_000_000n);
    expect(usdcToBaseUnits(999.99, 18)).toBe(99999n * 10n ** 16n);
    expect(usdcToBaseUnits(104, 6)).toBe(104_000_000n);
  });
});
