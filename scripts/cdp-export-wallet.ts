/**
 * One-shot CDP Avalanche signer bootstrap for BOND.
 *
 * Prerequisites in .env.local (never commit):
 *   CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 *   (Secret API key must allow Export private key)
 *
 * Usage: bun run cdp:export
 *
 * Prints env lines to stdout. Copy into .env.local / hosting secrets.
 * Does not write secrets to disk.
 */
import { config } from "dotenv";
import { CdpClient } from "@coinbase/cdp-sdk";

config({ path: ".env.local", override: true });

const ACCOUNT_NAME = process.env.CDP_IDEMPOTENCY_KEY || "bond-avalanche-primary";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Missing ${name}. See docs/memory/CDP_AGENTKIT_FLOW.md`);
    process.exit(1);
  }
  return v;
}

requireEnv("CDP_API_KEY_ID");
requireEnv("CDP_API_KEY_SECRET");
requireEnv("CDP_WALLET_SECRET");

const cdp = new CdpClient();

const account = await cdp.evm.getOrCreateAccount({ name: ACCOUNT_NAME });
const address = account.address;

const raw = await cdp.evm.exportAccount({ name: ACCOUNT_NAME });
const privateKey = raw.startsWith("0x") ? raw : `0x${raw}`;

console.log("");
console.log("# Paste into .env.local (gitignored) — never commit");
console.log(`CDP_WALLET_ADDRESS=${address}`);
console.log(`AGENT_PRIVATE_KEY=${privateKey}`);
console.log(`CDP_WALLET_PRIVATE_KEY=${privateKey}`);
console.log(`CDP_IDEMPOTENCY_KEY=${ACCOUNT_NAME}`);
console.log("");
console.log(`# Fund ≥100 USDC + AVAX on Avalanche: https://snowscan.xyz/address/${address}`);
console.log("# Then: bun run db:push && bun run dev → /dashboard/wallet");
