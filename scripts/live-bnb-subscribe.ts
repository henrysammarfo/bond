#!/usr/bin/env bun
/**
 * Live BNB IXS subscribe for demo@bond.app org — Pending money shot.
 * Requires LIVE_DEPOSIT=1 and funded BSC USDC + BNB gas.
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

if (process.env.LIVE_DEPOSIT !== "1") {
  console.error("Set LIVE_DEPOSIT=1");
  process.exit(1);
}

import { eq } from "drizzle-orm";
import { getDb } from "../src/backend/db/client.ts";
import { users, memberships, mandates, subscriptions, auditEvents } from "../src/backend/db/schema.ts";
import { secondaryBnbVaultId, getVault } from "../src/backend/ixs/client.ts";
import { runVaultPreflight, assertLiveDepositAmount } from "../src/backend/ixs/preflight.ts";
import { buildRequestDeposit, vaultGetMcp } from "../src/backend/ixs/mcp.ts";
import { evaluateMandate } from "../src/backend/serv/mandate.ts";
import {
  assertDepositFunding,
  executeTxSteps,
  getWalletAddress,
} from "../src/backend/agentkit/wallet.ts";
import { ensureOrgAgentWallet } from "../src/backend/org/integrations.ts";
import { recordEvidence } from "../src/backend/evidence/store.ts";
import { dollarsToCents, usdcToBaseUnits } from "../src/lib/status.ts";
import { sql } from "drizzle-orm";
import { writeFileSync } from "node:fs";

const EMAIL = process.env.DEMO_EMAIL || "demo@bond.app";
const AMOUNT = Number(process.env.DEPOSIT_USD || "104");
const vaultId = secondaryBnbVaultId();

const db = getDb();
const [user] = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
if (!user) throw new Error(`No user ${EMAIL}`);
const [mem] = await db.select().from(memberships).where(eq(memberships.userId, user.id)).limit(1);
if (!mem) throw new Error("No membership");
const orgId = mem.orgId;

await ensureOrgAgentWallet(orgId);
const ownerAddress = await getWalletAddress(orgId);

let [mandate] = await db
  .select()
  .from(mandates)
  .where(eq(mandates.orgId, orgId));
const needBnb =
  !mandate ||
  !(
    mandate.network.toLowerCase().includes("bnb") ||
    mandate.network.toLowerCase().includes("bsc")
  );
if (needBnb) {
  const [created] = await db
    .insert(mandates)
    .values({
      orgId,
      name: "OpenServ BNB live leg",
      network: "BNB Chain",
      asset: "USDC",
      monthlyLimitCents: 100_000,
      usedCents: 0,
      status: "active",
    })
    .returning();
  mandate = created;
  console.log(JSON.stringify({ mandateCreated: mandate.id, network: mandate.network }));
} else {
  console.log(JSON.stringify({ mandateReuse: mandate.id, network: mandate.network }));
}

const vault = await getVault(vaultId);
const preflight = await runVaultPreflight({
  vaultId,
  wallet: ownerAddress,
  amountUsd: AMOUNT,
  live: true,
});
await recordEvidence({
  kind: "preflight",
  label: `Live subscribe preflight · ${vault.name}`,
  chainId: vault.chainId,
  blockNumber: preflight.blockNumber,
  request: { vaultId, amount: AMOUNT, wallet: ownerAddress },
  response: { verdict: preflight.verdict, checks: preflight.checks },
  ok: preflight.ok,
});
assertLiveDepositAmount(AMOUNT, preflight);

const decision = await evaluateMandate({
  amountDollars: AMOUNT,
  network: "BNB Chain",
  asset: mandate.asset,
  vaultId,
  mandateLimitCents: mandate.monthlyLimitCents,
  mandateUsedCents: mandate.usedCents,
  mandateStatus: mandate.status,
  orgId,
});
if (!decision.allow) throw new Error(`SERV denied: ${decision.reason}`);
await recordEvidence({
  kind: "serv",
  label: `Mandate gate · ${decision.source}`,
  request: { amount: AMOUNT, network: "BNB Chain", vaultId },
  response: decision,
  ok: decision.allow,
});

const mcpMeta = await vaultGetMcp(vaultId);
const settlement = String(mcpMeta.settlement ?? "async-erc7540");
await assertDepositFunding(ownerAddress, AMOUNT, "bsc");
const decimals = vault.underlyingAsset.decimals ?? 18;
const assetAmount = usdcToBaseUnits(AMOUNT, decimals).toString();

const built = await buildRequestDeposit({
  vaultId,
  ownerAddress,
  assetAmount,
});
console.log(JSON.stringify({ steps: built.steps?.length, settlement: built.settlement || settlement }));

const hashes = await executeTxSteps(built.steps, orgId, "bsc");
const approveTxHash = hashes[0] ?? null;
const requestTxHash = hashes[hashes.length - 1] ?? null;

const [sub] = await db
  .insert(subscriptions)
  .values({
    orgId,
    mandateId: mandate.id,
    vaultId: vault.id,
    vaultName: vault.name,
    network: vault.chainName || vault.network,
    amountCents: dollarsToCents(AMOUNT),
    status: "Pending",
    shares: null,
    ownerAddress,
    approveTxHash,
    requestTxHash,
    settlement: built.settlement || settlement,
    metadata: {
      serv: decision,
      preflight,
      mcp: { settlement: built.settlement || settlement },
      networkLabel: "BNB Chain",
      path: "scripts/live-bnb-subscribe.ts",
    },
  })
  .returning();

await db
  .update(mandates)
  .set({ usedCents: sql`${mandates.usedCents} + ${dollarsToCents(AMOUNT)}` })
  .where(eq(mandates.id, mandate.id));

await db.insert(auditEvents).values({
  orgId,
  subscriptionId: sub.id,
  event: "Deposit submitted",
  detail: `$${AMOUNT} USDC · BNB Chain · Pending (not earning) · ${decision.source} · preflight ${preflight.verdict}`,
  tone: "pending",
});

const result = {
  ok: true,
  subscriptionId: sub.id,
  status: "Pending",
  ownerAddress,
  vaultId,
  amount: AMOUNT,
  approveTxHash,
  requestTxHash,
  bscscanApprove: approveTxHash ? `https://bscscan.com/tx/${approveTxHash}` : null,
  bscscanRequest: requestTxHash ? `https://bscscan.com/tx/${requestTxHash}` : null,
  evidence: "https://bond-pi.vercel.app/evidence",
  subscriptionUrl: `https://bond-pi.vercel.app/dashboard/subscriptions/${sub.id}`,
  serv: decision,
  preflightVerdict: preflight.verdict,
};

writeFileSync("/tmp/bnb-subscribe-result.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
