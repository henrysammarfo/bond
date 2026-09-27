/**
 * One-shot CDP Avalanche signer bootstrap for BOND.
 *
 * Prerequisites in .env.local (never commit):
 *   CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
 *   Prefer Secret API key with Export scope; without export we keep local AGENT_PRIVATE_KEY.
 *
 * Usage: bun run cdp:export
 */
import { config } from "dotenv";
import { CdpClient } from "@coinbase/cdp-sdk";
import { privateKeyToAccount } from "viem/accounts";

config({ path: ".env.local", override: true });

const ACCOUNT_NAME = process.env.CDP_IDEMPOTENCY_KEY || "bond-avalanche-primary";
const FUNDED_NAME = "bond-avalanche-funded";

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
console.log(`cdp_named_account ${ACCOUNT_NAME} ${account.address}`);

const existingPk = process.env.AGENT_PRIVATE_KEY?.trim();
if (existingPk) {
  const derived = privateKeyToAccount(
    (existingPk.startsWith("0x") ? existingPk : `0x${existingPk}`) as `0x${string}`,
  );
  try {
    const imported = await cdp.evm.importAccount({
      privateKey: derived.address && existingPk.startsWith("0x") ? existingPk : `0x${existingPk.replace(/^0x/, "")}`,
      name: FUNDED_NAME,
    });
    console.log(`cdp_imported ${FUNDED_NAME} ${imported.address}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already|exists|conflict/i.test(msg)) {
      console.log(`cdp_import_skip ${FUNDED_NAME} (${msg.slice(0, 80)})`);
    } else {
      console.warn(`cdp_import_warn ${msg}`);
    }
  }
  console.log("");
  console.log("# Keep signing with existing AGENT_PRIVATE_KEY (already set)");
  console.log(`CDP_WALLET_ADDRESS=${derived.address}`);
  console.log(`# Fund ≥100 USDC + AVAX: https://snowscan.xyz/address/${derived.address}`);
} else {
  try {
    const raw = await cdp.evm.exportAccount({ name: ACCOUNT_NAME });
    const privateKey = raw.startsWith("0x") ? raw : `0x${raw}`;
    console.log("");
    console.log("# Paste into .env.local (gitignored) — never commit");
    console.log(`CDP_WALLET_ADDRESS=${account.address}`);
    console.log(`AGENT_PRIVATE_KEY=${privateKey}`);
    console.log(`CDP_WALLET_PRIVATE_KEY=${privateKey}`);
    console.log(`CDP_IDEMPOTENCY_KEY=${ACCOUNT_NAME}`);
    console.log(`# Fund ≥100 USDC + AVAX: https://snowscan.xyz/address/${account.address}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("");
    console.error("Export blocked (API key needs accounts#export scope in CDP Portal).");
    console.error(msg);
    console.error("");
    console.error(`Named CDP account ready: ${account.address}`);
    console.error("Either enable Export on the Secret API key, or set AGENT_PRIVATE_KEY locally");
    console.error("and re-run to import that key as bond-avalanche-funded.");
    process.exit(1);
  }
}
