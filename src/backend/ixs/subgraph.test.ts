import { describe, expect, test } from "bun:test";
import { requestStatusFromSubgraph } from "./subgraph";

describe("IXS subgraph request status", () => {
  test("BNB vault redeem request 10 is PENDING for demo wallet", async () => {
    const status = await requestStatusFromSubgraph({
      vaultId: "6a26624ca7d16b245d665475",
      ownerAddress: "0x1eFBb041E94aCc18D50C578eD34c265075d3b14e",
    });
    expect(status.source).toBe("subgraph");
    const redeems = status.redeemRequests as Array<Record<string, unknown>>;
    expect(Array.isArray(redeems)).toBe(true);
    expect(redeems.length).toBeGreaterThan(0);
    const hit = redeems.find((r) => String(r.requestId) === "10") ?? redeems[0];
    expect(String(hit.requestId)).toBe("10");
    expect(String(hit.status)).toBe("PENDING");
    expect(status.claimable).toBe(false);
    expect(Array.isArray(status.depositRequests)).toBe(true);
  }, 20_000);
});
