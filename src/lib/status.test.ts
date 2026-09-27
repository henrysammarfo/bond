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

  test("USDC base units use 6 decimals", () => {
    expect(usdcToBaseUnits(100)).toBe(100_000_000n);
    expect(dollarsToCents(100)).toBe(10000);
  });
});
