import { describe, expect, test } from "bun:test";
import { createHash, randomBytes } from "node:crypto";

// Isolate encryption key for unit tests
process.env.SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
process.env.INTEGRATIONS_ENCRYPTION_KEY = process.env.SESSION_SECRET;

const { sealSecret, openSecret, maskSecret } = await import("../crypto/secretBox");

describe("secretBox AES-256-GCM", () => {
  test("round-trips plaintext", () => {
    const sealed = sealSecret("serv_test_key_value");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(openSecret(sealed)).toBe("serv_test_key_value");
  });

  test("tamper fails closed", () => {
    const sealed = sealSecret("sk-agentrouter");
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => openSecret(parts.join("."))).toThrow();
  });

  test("mask hides middle", () => {
    expect(maskSecret("serv_abcdefghijklmnop")).toContain("…");
    expect(maskSecret(null)).toBeNull();
  });
});

describe("mandate policy (no network)", () => {
  test("denies under 100 before LLM", async () => {
    const { evaluateMandate } = await import("../serv/mandate");
    const d = await evaluateMandate({
      amountDollars: 50,
      network: "avalanche-mainnet",
      asset: "USDC",
      vaultId: "6a952729732c2b84b55ce89d",
      mandateLimitCents: 100000,
      mandateUsedCents: 0,
      mandateStatus: "active",
    });
    expect(d.allow).toBe(false);
    expect(d.source).toBe("policy");
  });
});

describe("assertDepositFunding messaging", () => {
  test("exports helper", async () => {
    const { assertDepositFunding } = await import("../agentkit/wallet");
    expect(typeof assertDepositFunding).toBe("function");
  });
});

describe("encryption key derivation stability", () => {
  test("sha256 length 32", () => {
    const k = createHash("sha256").update(process.env.SESSION_SECRET!).digest();
    expect(k.length).toBe(32);
  });
});
