import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { auditEvents, mandates, orgs, subscriptions } from "../db/schema";
import { requireAuth } from "../auth/session";
import { getMandateForOrg, getSubscriptionForOrg } from "../tenancy";
import { getVault, getPosition, primaryVaultId, depositableVaultIds } from "../ixs/client";
import { buildClaimDeposit, buildRequestDeposit, requestStatus, vaultGetMcp } from "../ixs/mcp";
import { evaluateMandate } from "../serv/mandate";
import {
  executeTxSteps,
  getWalletAddress,
  getWalletBalances,
  assertDepositFunding,
  chainFromVaultChainId,
} from "../agentkit/wallet";
import { ensureOrgAgentWallet } from "../org/integrations";
import {
  centsToDollars,
  displayShares,
  dollarsToCents,
  ownedValueCents,
  usdcToBaseUnits,
  type SubscriptionStatus,
} from "../../lib/status";

export const getDashboardOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  const db = getDb();
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, auth.orgId))
    .orderBy(desc(subscriptions.createdAt));
  const pendingCents = subs
    .filter((s) => s.status === "Pending" || s.status === "Claimable")
    .reduce((a, s) => a + s.amountCents, 0);
  const ownedCents = subs
    .filter((s) => s.status === "Finalized")
    .reduce((a, s) => a + ownedValueCents(s.status as SubscriptionStatus, s.amountCents), 0);
  const activeMandate = await db
    .select()
    .from(mandates)
    .where(and(eq(mandates.orgId, auth.orgId), eq(mandates.status, "active")))
    .limit(1);
  const events = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.orgId, auth.orgId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(8);

  let walletUsdc = "—";
  try {
    await ensureOrgAgentWallet(auth.orgId);
    const address = await getWalletAddress(auth.orgId);
    const bal = await getWalletBalances(address);
    walletUsdc = bal.usdc;
  } catch {
    // Wallet credentials may be absent until secrets are wired; overview still returns DB truth.
  }

  return {
    orgName: auth.orgName,
    owned: centsToDollars(ownedCents),
    pending: centsToDollars(pendingCents),
    availableUsdc: walletUsdc,
    mandateRemaining: activeMandate[0]
      ? centsToDollars(activeMandate[0].monthlyLimitCents - activeMandate[0].usedCents)
      : "0.00",
    mandateLimit: activeMandate[0] ? centsToDollars(activeMandate[0].monthlyLimitCents) : "0.00",
    activity: events.map((e) => ({
      event: e.event,
      detail: e.detail,
      time: e.createdAt.toISOString(),
      tone: e.tone,
    })),
  };
});

export const listSubscriptionsFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        status: z.enum(["All", "Pending", "Finalized", "Rejected", "Claimable"]).optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const db = getDb();
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.orgId, auth.orgId))
      .orderBy(desc(subscriptions.createdAt));
    const filter = data?.status ?? "All";
    return rows
      .filter((s) => filter === "All" || s.status === filter)
      .map((s) => ({
        id: s.id,
        vault: s.vaultName,
        amount: `$${centsToDollars(s.amountCents)}`,
        status: s.status,
        shares: displayShares(s.status as SubscriptionStatus, s.shares),
        date: s.createdAt.toISOString().slice(0, 10),
        network: s.network,
      }));
  });

export const getSubscriptionFn = createServerFn({ method: "GET" })
  .validator(z.object({ subscriptionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const sub = await getSubscriptionForOrg(auth, data.subscriptionId);
    const db = getDb();
    const events = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.orgId, auth.orgId), eq(auditEvents.subscriptionId, sub.id)))
      .orderBy(desc(auditEvents.createdAt));
    return {
      id: sub.id,
      vaultId: sub.vaultId,
      vaultName: sub.vaultName,
      network: sub.network,
      amount: `$${centsToDollars(sub.amountCents)}`,
      status: sub.status,
      shares: displayShares(sub.status as SubscriptionStatus, sub.shares),
      ownedValue: `$${centsToDollars(ownedValueCents(sub.status as SubscriptionStatus, sub.amountCents))}`,
      ownerAddress: sub.ownerAddress,
      approveTxHash: sub.approveTxHash,
      requestTxHash: sub.requestTxHash,
      claimTxHash: sub.claimTxHash,
      requestId: sub.requestId,
      settlement: sub.settlement,
      serv: (() => {
        const meta = (sub.metadata ?? {}) as { serv?: { allow?: boolean; reason?: string; source?: string } };
        return meta.serv
          ? {
              allow: Boolean(meta.serv.allow),
              reason: meta.serv.reason ?? "",
              source: meta.serv.source ?? "unknown",
            }
          : null;
      })(),
      events: events.map((e) => ({
        event: e.event,
        detail: e.detail,
        time: e.createdAt.toISOString(),
        tone: e.tone,
      })),
    };
  });

export const listActivityFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  const db = getDb();
  const events = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.orgId, auth.orgId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(100);
  return events.map((e) => ({
    event: e.event,
    detail: e.detail,
    time: e.createdAt.toISOString(),
    tone: e.tone,
  }));
});

export const getWalletFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  await ensureOrgAgentWallet(auth.orgId);
  const address = await getWalletAddress(auth.orgId);
  const [avalanche, bnb] = await Promise.all([
    getWalletBalances(address, "avalanche"),
    getWalletBalances(address, "bsc"),
  ]);
  return {
    address,
    source: "org-agentkit" as const,
    avalanche,
    bnb,
    // Legacy single-chain fields (Avalanche) for older UI bindings.
    network: avalanche.network,
    chainId: avalanche.chainId,
    usdc: avalanche.usdc,
    avax: avalanche.avax,
    bnbNative: bnb.bnb,
    bnbUsdc: bnb.usdc,
  };
});

export const getSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  const db = getDb();
  const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
  return {
    orgName: org.name,
    reportingCurrency: org.reportingCurrency,
    notificationsEnabled: org.notificationsEnabled,
    displayName: auth.displayName,
    email: auth.email,
  };
});

export const updateSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orgName: z.string().min(2).max(120),
      notificationsEnabled: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const db = getDb();
    await db
      .update(orgs)
      .set({ name: data.orgName, notificationsEnabled: data.notificationsEnabled })
      .where(eq(orgs.id, auth.orgId));
    return { ok: true as const };
  });

export const subscribeVaultFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      vaultId: z.string().min(8),
      amountDollars: z.number().min(100),
      mandateId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    if (!depositableVaultIds().has(data.vaultId)) {
      throw new Error(
        "This vault is not open for AgentKit subscribe (whitelist or unsupported). Use Avalanche primary or BNB permissionless vault.",
      );
    }
    const mandate = await getMandateForOrg(auth, data.mandateId);
    const vault = await getVault(data.vaultId);
    const depositChain = chainFromVaultChainId(vault.chainId);
    const networkLabel = depositChain === "bsc" ? "BNB Chain" : "Avalanche";
    // Mandate network field is Avalanche by default — allow BNB when vault is BNB.
    const networkForGate =
      depositChain === "bsc"
        ? mandate.network.toLowerCase().includes("bnb") ||
          mandate.network.toLowerCase().includes("bsc")
          ? mandate.network
          : "BNB Chain"
        : mandate.network;
    const decision = await evaluateMandate({
      amountDollars: data.amountDollars,
      network: networkForGate,
      asset: mandate.asset,
      vaultId: data.vaultId,
      mandateLimitCents: mandate.monthlyLimitCents,
      mandateUsedCents: mandate.usedCents,
      mandateStatus: mandate.status,
      orgId: auth.orgId,
    });
    if (!decision.allow) {
      throw new Error(`SERV mandate denied: ${decision.reason}`);
    }

    const mcpMeta = await vaultGetMcp(data.vaultId);
    const settlement = String(mcpMeta.settlement ?? "async-erc7540");
    await ensureOrgAgentWallet(auth.orgId);
    const ownerAddress = await getWalletAddress(auth.orgId);
    await assertDepositFunding(ownerAddress, data.amountDollars, depositChain);
    const assetAmount = usdcToBaseUnits(data.amountDollars).toString();

    const built = await buildRequestDeposit({
      vaultId: data.vaultId,
      ownerAddress,
      assetAmount,
    });
    const hashes = await executeTxSteps(built.steps, auth.orgId, depositChain);
    const approveTxHash = hashes[0] ?? null;
    const requestTxHash = hashes[hashes.length - 1] ?? null;

    const db = getDb();
    const [sub] = await db
      .insert(subscriptions)
      .values({
        orgId: auth.orgId,
        mandateId: mandate.id,
        vaultId: vault.id,
        vaultName: vault.name,
        network: vault.chainName || vault.network,
        amountCents: dollarsToCents(data.amountDollars),
        status: "Pending",
        shares: null,
        ownerAddress,
        approveTxHash,
        requestTxHash,
        settlement: built.settlement || settlement,
        metadata: { serv: decision, mcp: { settlement: built.settlement || settlement } },
      })
      .returning();

    await db
      .update(mandates)
      .set({ usedCents: sql`${mandates.usedCents} + ${dollarsToCents(data.amountDollars)}` })
      .where(eq(mandates.id, mandate.id));

    await db.insert(auditEvents).values({
      orgId: auth.orgId,
      subscriptionId: sub.id,
      event: "Deposit submitted",
      detail: `$${data.amountDollars} USDC · ${vault.chainName} · Pending (not earning) · ${decision.source}`,
      tone: "pending",
    });

    return {
      subscriptionId: sub.id,
      status: "Pending" as const,
      approveTxHash,
      requestTxHash,
      serv: decision,
      message:
        "Deposit submitted. Status is Pending — not owned and not earning until shares exist.",
    };
  });

export const refreshSubscriptionFn = createServerFn({ method: "POST" })
  .validator(z.object({ subscriptionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const sub = await getSubscriptionForOrg(auth, data.subscriptionId);
    if (sub.status === "Finalized" || sub.status === "Rejected") {
      return { status: sub.status, shares: sub.shares };
    }

    const statusPayload = await requestStatus({
      vaultId: sub.vaultId,
      ownerAddress: sub.ownerAddress,
    });
    const position = await getPosition(sub.vaultId, sub.ownerAddress);
    const shareBalance = String(
      position.shareBalance ?? position.shares ?? position.share_balance ?? "0",
    );
    const claimable =
      Boolean(statusPayload.claimable) ||
      Boolean(statusPayload.isClaimable) ||
      Number(statusPayload.claimableAssets ?? statusPayload.claimableShares ?? 0) > 0;
    const requestId = String(
      statusPayload.requestId ?? statusPayload.request_id ?? sub.requestId ?? "",
    );

    const db = getDb();
    if (claimable && shareBalance === "0") {
      await db
        .update(subscriptions)
        .set({ status: "Claimable", requestId: requestId || sub.requestId, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      return { status: "Claimable" as const, shares: null, requestId };
    }

    if (shareBalance !== "0" && Number(shareBalance) > 0) {
      await db
        .update(subscriptions)
        .set({ status: "Finalized", shares: shareBalance, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      await db.insert(auditEvents).values({
        orgId: auth.orgId,
        subscriptionId: sub.id,
        event: "Shares finalized",
        detail: `${shareBalance} vault shares proven via IXS position`,
        tone: "good",
      });
      return { status: "Finalized" as const, shares: shareBalance };
    }

    return { status: "Pending" as const, shares: null, requestStatus: statusPayload };
  });

export const claimSubscriptionFn = createServerFn({ method: "POST" })
  .validator(z.object({ subscriptionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const sub = await getSubscriptionForOrg(auth, data.subscriptionId);
    if (sub.status === "Finalized") return { status: "Finalized" as const, shares: sub.shares };

    const statusPayload = await requestStatus({
      vaultId: sub.vaultId,
      ownerAddress: sub.ownerAddress,
    });
    const requestId = String(
      statusPayload.requestId ?? statusPayload.request_id ?? sub.requestId ?? "",
    );
    if (!requestId) throw new Error("No claimable requestId from IXS yet. Keep Pending.");

    const built = await buildClaimDeposit({
      vaultId: sub.vaultId,
      ownerAddress: sub.ownerAddress,
      requestId,
    });
    const vaultMeta = await getVault(sub.vaultId);
    const hashes = await executeTxSteps(
      built.steps,
      auth.orgId,
      chainFromVaultChainId(vaultMeta.chainId),
    );
    const claimTxHash = hashes[hashes.length - 1] ?? null;
    const position = await getPosition(sub.vaultId, sub.ownerAddress);
    const shareBalance = String(
      position.shareBalance ?? position.shares ?? position.share_balance ?? "0",
    );
    if (shareBalance === "0" || Number(shareBalance) <= 0) {
      throw new Error(
        "Claim submitted but IXS position still shows zero shares. Not marking Finalized.",
      );
    }

    const db = getDb();
    await db
      .update(subscriptions)
      .set({
        status: "Finalized",
        shares: shareBalance,
        claimTxHash,
        requestId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
    await db.insert(auditEvents).values({
      orgId: auth.orgId,
      subscriptionId: sub.id,
      event: "Shares claimed",
      detail: `${shareBalance} shares · claim ${claimTxHash}`,
      tone: "good",
    });
    return { status: "Finalized" as const, shares: shareBalance, claimTxHash };
  });
