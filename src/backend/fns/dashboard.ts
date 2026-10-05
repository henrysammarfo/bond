import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { auditEvents, mandates, orgs, subscriptions } from "../db/schema";
import { requireAuth } from "../auth/session";
import { getMandateForOrg, getSubscriptionForOrg } from "../tenancy";
import { getVault, getPosition, primaryVaultId, depositableVaultIds } from "../ixs/client";
import {
  buildClaimDeposit,
  buildClaimRedeem,
  buildRequestDeposit,
  buildRequestRedeem,
  requestStatus,
  vaultGetMcp,
} from "../ixs/mcp";
import { evaluateMandate } from "../serv/mandate";
import {
  executeTxSteps,
  getWalletAddress,
  getWalletBalances,
  assertDepositFunding,
  chainFromVaultChainId,
  transferUsdc,
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
import {
  assertLiveDepositAmount,
  runVaultPreflight,
  LIVE_REDEEMABLE_MIN_USD,
} from "../ixs/preflight";
import { recordEvidence } from "../evidence/store";

export const getDashboardOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  const db = getDb();
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.orgId, auth.orgId))
    .orderBy(desc(subscriptions.createdAt));
  const pendingCents = subs
    .filter(
      (s) =>
        s.status === "Pending" ||
        s.status === "Claimable" ||
        s.status === "RedeemPending" ||
        s.status === "RedeemClaimable",
    )
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
    const [avaxBal, bscBal] = await Promise.all([
      getWalletBalances(address, "avalanche"),
      getWalletBalances(address, "bsc"),
    ]);
    const total = Number(avaxBal.usdc) + Number(bscBal.usdc);
    walletUsdc = Number.isFinite(total) ? total.toFixed(2) : avaxBal.usdc;
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
        status: z
          .enum([
            "All",
            "Pending",
            "Finalized",
            "Rejected",
            "Claimable",
            "RedeemPending",
            "RedeemClaimable",
            "Withdrawn",
          ])
          .optional(),
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

    const meta = (sub.metadata ?? {}) as {
      serv?: { allow?: boolean; reason?: string; source?: string };
      redeem?: {
        requestId?: string;
        requestTxHash?: string;
        claimTxHash?: string;
        withdrawTxHash?: string;
        toAddress?: string;
        settlement?: string;
      };
    };

    let live: {
      shareBalance: string;
      shareValue: string | null;
      maxRedeem: string;
      maxWithdraw: string;
      walletUsdc: string | null;
      redeemRequestId: string | null;
      redeemStatus: string | null;
    } | null = null;
    try {
      const position = await getPosition(sub.vaultId, sub.ownerAddress);
      const vaultMeta = await getVault(sub.vaultId);
      const chain = chainFromVaultChainId(vaultMeta.chainId);
      const bal = await getWalletBalances(sub.ownerAddress as `0x${string}`, chain);
      let redeemRequestId = meta.redeem?.requestId ?? null;
      let redeemStatus: string | null = null;
      if (
        sub.status === "RedeemPending" ||
        sub.status === "RedeemClaimable" ||
        meta.redeem?.requestTxHash
      ) {
        try {
          const { requestStatus } = await import("../ixs/mcp");
          const statusPayload = await requestStatus({
            vaultId: sub.vaultId,
            ownerAddress: sub.ownerAddress,
          });
          const rows = (statusPayload.redeemRequests as Array<Record<string, unknown>> | undefined) ?? [];
          const hit =
            (redeemRequestId
              ? rows.find((r) => String(r.requestId ?? "") === redeemRequestId)
              : undefined) ?? rows[0];
          if (hit) {
            redeemRequestId = String(hit.requestId ?? redeemRequestId ?? "");
            redeemStatus = String(hit.status ?? "");
          }
        } catch {
          // keep metadata-only redeem ids
        }
      }
      live = {
        shareBalance: String(position.shareBalance ?? "0"),
        shareValue:
          position["shareValueInAssets"] != null ? String(position["shareValueInAssets"]) : null,
        maxRedeem: String(position.maxRedeem ?? "0"),
        maxWithdraw: String(position.maxWithdraw ?? "0"),
        walletUsdc: bal.usdc,
        redeemRequestId,
        redeemStatus,
      };
    } catch {
      live = null;
    }

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
      redeem: meta.redeem ?? null,
      live,
      serv: meta.serv
        ? {
            allow: Boolean(meta.serv.allow),
            reason: meta.serv.reason ?? "",
            source: meta.serv.source ?? "unknown",
          }
        : null,
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
      amountDollars: z.number().min(LIVE_REDEEMABLE_MIN_USD),
      mandateId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    if (process.env.LIVE_DEPOSIT !== "1") {
      throw new Error(
        "Live deposits are gated. Set LIVE_DEPOSIT=1 on the host to enable AgentKit broadcast.",
      );
    }
    if (!depositableVaultIds().has(data.vaultId)) {
      throw new Error(
        "This vault is not open for AgentKit subscribe (whitelist or unsupported). Use Avalanche primary or BNB permissionless vault.",
      );
    }
    const mandate = await getMandateForOrg(auth, data.mandateId);
    const vault = await getVault(data.vaultId);
    const depositChain = chainFromVaultChainId(vault.chainId);
    const networkLabel = depositChain === "bsc" ? "BNB Chain" : "Avalanche";
    const networkForGate =
      depositChain === "bsc"
        ? mandate.network.toLowerCase().includes("bnb") ||
          mandate.network.toLowerCase().includes("bsc")
          ? mandate.network
          : "BNB Chain"
        : mandate.network;

    await ensureOrgAgentWallet(auth.orgId);
    const ownerAddress = await getWalletAddress(auth.orgId);

    const preflight = await runVaultPreflight({
      vaultId: data.vaultId,
      wallet: ownerAddress,
      amountUsd: data.amountDollars,
      live: true,
    });
    await recordEvidence({
      kind: "preflight",
      label: `Live subscribe preflight · ${vault.name}`,
      chainId: vault.chainId,
      blockNumber: preflight.blockNumber,
      request: { vaultId: data.vaultId, amount: data.amountDollars, wallet: ownerAddress },
      response: { verdict: preflight.verdict, checks: preflight.checks },
      ok: preflight.ok,
    });
    assertLiveDepositAmount(data.amountDollars, preflight);

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
    await recordEvidence({
      kind: "serv",
      label: `Mandate gate · ${decision.source}`,
      request: { amount: data.amountDollars, network: networkForGate, vaultId: data.vaultId },
      response: decision,
      ok: decision.allow,
    });

    const mcpMeta = await vaultGetMcp(data.vaultId);
    const settlement = String(mcpMeta.settlement ?? "async-erc7540");
    await assertDepositFunding(ownerAddress, data.amountDollars, depositChain);
    const decimals = vault.underlyingAsset.decimals ?? (depositChain === "bsc" ? 18 : 6);
    const assetAmount = usdcToBaseUnits(data.amountDollars, decimals).toString();

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
        metadata: {
          serv: decision,
          preflight,
          mcp: { settlement: built.settlement || settlement },
          networkLabel,
        },
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
      detail: `$${data.amountDollars} USDC · ${vault.chainName} · Pending (not earning) · ${decision.source} · preflight ${preflight.verdict}`,
      tone: "pending",
    });

    return {
      subscriptionId: sub.id,
      status: "Pending" as const,
      approveTxHash,
      requestTxHash,
      serv: decision,
      preflight,
      message:
        "Deposit submitted. Status is Pending — not owned and not earning until shares exist.",
    };
  });

function positiveUnits(raw: string | null | undefined): boolean {
  if (raw == null || raw === "" || raw === "0" || raw === "0.0") return false;
  try {
    const whole = String(raw).split(".")[0] ?? "0";
    return BigInt(whole) > 0n;
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0;
  }
}

type RedeemMeta = {
  requestId?: string;
  requestTxHash?: string;
  claimTxHash?: string;
  withdrawTxHash?: string;
  toAddress?: string;
  settlement?: string;
};

function readRedeemMeta(sub: { metadata: Record<string, unknown> | null }): RedeemMeta {
  const meta = (sub.metadata ?? {}) as { redeem?: RedeemMeta };
  return meta.redeem ?? {};
}

function withRedeemMeta(
  sub: { metadata: Record<string, unknown> | null },
  patch: RedeemMeta,
): Record<string, unknown> {
  const meta = { ...(sub.metadata ?? {}) } as Record<string, unknown>;
  meta["redeem"] = { ...readRedeemMeta(sub), ...patch };
  return meta;
}

function extractRedeemRequest(statusPayload: Record<string, unknown>, preferId?: string) {
  const bags: unknown[] = [];
  for (const key of [
    "redeemRequests",
    "redeems",
    "requests",
    "items",
    "depositRequests",
    "data",
  ]) {
    const v = statusPayload[key];
    if (Array.isArray(v)) bags.push(...v);
  }
  if (Array.isArray(statusPayload)) bags.push(...statusPayload);

  const rows = bags.filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;
  const redeemish = rows.filter((r) => {
    const kind = String(
      r["type"] ?? r["kind"] ?? r["requestType"] ?? r["action"] ?? "",
    ).toLowerCase();
    if (!kind) return true;
    return kind.includes("redeem") || kind.includes("withdraw");
  });
  const pool = redeemish.length ? redeemish : rows;
  const hit =
    (preferId
      ? pool.find(
          (r) => String(r["requestId"] ?? r["request_id"] ?? r["id"] ?? "") === preferId,
        )
      : undefined) ??
    pool.find((r) => {
      const st = String(r["status"] ?? "").toLowerCase();
      return st.includes("claim") || st === "pending" || st === "queued" || st === "finalized";
    }) ??
    pool[0];
  if (!hit) return null;
  const status = String(hit["status"] ?? "");
  const claimable =
    Boolean(hit["claimable"]) ||
    Boolean(hit["isClaimable"]) ||
    /claimable|claim|finalized|fulfilled|processed|settled/i.test(status);
  return {
    requestId: String(hit["requestId"] ?? hit["request_id"] ?? hit["id"] ?? ""),
    status,
    claimable,
    raw: hit,
  };
}

export const refreshSubscriptionFn = createServerFn({ method: "POST" })
  .validator(z.object({ subscriptionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const sub = await getSubscriptionForOrg(auth, data.subscriptionId);
    if (sub.status === "Rejected" || sub.status === "Withdrawn") {
      return { status: sub.status, shares: sub.shares };
    }

    const statusPayload = await requestStatus({
      vaultId: sub.vaultId,
      ownerAddress: sub.ownerAddress,
    });
    const position = await getPosition(sub.vaultId, sub.ownerAddress);
    const shareBalance = String(position.shareBalance ?? "0");
    const redeemMeta = readRedeemMeta(sub);
    const redeemInfo = extractRedeemRequest(statusPayload, redeemMeta.requestId);
    const db = getDb();

    // Redeem lifecycle first when already exiting.
    if (
      sub.status === "RedeemPending" ||
      sub.status === "RedeemClaimable" ||
      redeemMeta.requestTxHash
    ) {
      if (redeemInfo?.claimable) {
        await db
          .update(subscriptions)
          .set({
            status: "RedeemClaimable",
            metadata: withRedeemMeta(sub, {
              requestId: redeemInfo.requestId || redeemMeta.requestId,
            }),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));
        return {
          status: "RedeemClaimable" as const,
          shares: shareBalance,
          redeemRequestId: redeemInfo.requestId || redeemMeta.requestId,
        };
      }

      // Some IXS vaults settle redeem without a separate claim — USDC lands in wallet.
      try {
        const vaultMeta = await getVault(sub.vaultId);
        const chain = chainFromVaultChainId(vaultMeta.chainId);
        const bal = await getWalletBalances(sub.ownerAddress as `0x${string}`, chain);
        if (!positiveUnits(shareBalance) && Number(bal.usdc) > 0.5) {
          await db
            .update(subscriptions)
            .set({
              status: "RedeemClaimable",
              shares: shareBalance,
              metadata: withRedeemMeta(sub, {
                requestId: redeemInfo?.requestId || redeemMeta.requestId,
                settlement: "queued-no-claim",
              }),
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, sub.id));
          return {
            status: "RedeemClaimable" as const,
            shares: shareBalance,
            walletUsdc: bal.usdc,
            note: "Redeem appears settled into AgentKit USDC — withdraw to your address.",
          };
        }
      } catch {
        // keep RedeemPending
      }

      await db
        .update(subscriptions)
        .set({
          status: "RedeemPending",
          metadata: withRedeemMeta(sub, {
            requestId: redeemInfo?.requestId || redeemMeta.requestId,
            requestTxHash: redeemMeta.requestTxHash,
          }),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));
      return {
        status: "RedeemPending" as const,
        shares: shareBalance,
        redeemRequestId: redeemInfo?.requestId || redeemMeta.requestId || null,
        redeemStatus: redeemInfo?.status || null,
        requestStatus: statusPayload,
        note:
          redeemInfo?.status === "PENDING"
            ? "IXS redeem request is PENDING on the vault subgraph — wait for their settlement cycle, then Refresh again."
            : "Redeem still queued. Instant maxRedeem stays 0 until IXS finalizes.",
      };
    }

    const claimable =
      Boolean(statusPayload.claimable) ||
      Boolean(statusPayload.isClaimable) ||
      Number(statusPayload.claimableAssets ?? statusPayload.claimableShares ?? 0) > 0;
    const requestId = String(
      statusPayload.requestId ?? statusPayload.request_id ?? sub.requestId ?? "",
    );

    if (claimable && !positiveUnits(shareBalance)) {
      await db
        .update(subscriptions)
        .set({ status: "Claimable", requestId: requestId || sub.requestId, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      return { status: "Claimable" as const, shares: null, requestId };
    }

    if (positiveUnits(shareBalance)) {
      if (sub.status !== "Finalized") {
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
      } else if (sub.shares !== shareBalance) {
        await db
          .update(subscriptions)
          .set({ shares: shareBalance, updatedAt: new Date() })
          .where(eq(subscriptions.id, sub.id));
      }
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
    const shareBalance = String(position.shareBalance ?? "0");
    if (!positiveUnits(shareBalance)) {
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

const ethAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid 0x EVM address");

/** Queue IXS ERC-7540 redeem for live vault shares (AgentKit signs). */
export const requestRedeemFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      subscriptionId: z.string().uuid(),
      /** Optional; default = full live share balance. */
      shareAmount: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const sub = await getSubscriptionForOrg(auth, data.subscriptionId);
    if (sub.status === "Withdrawn") throw new Error("Already withdrawn.");
    if (sub.status === "RedeemPending" || sub.status === "RedeemClaimable") {
      throw new Error("Redeem already queued. Use Refresh, then Claim redeem / Withdraw.");
    }

    const position = await getPosition(sub.vaultId, sub.ownerAddress);
    const liveShares = String(position.shareBalance ?? sub.shares ?? "0");
    const shareAmount = data.shareAmount?.trim() || liveShares;
    if (!positiveUnits(shareAmount)) {
      if (sub.status === "Pending" || sub.status === "Claimable") {
        throw new Error("Deposit still Pending/Claimable and IXS shows no shares yet.");
      }
      throw new Error("No live vault shares to redeem on IXS.");
    }

    const built = await buildRequestRedeem({
      vaultId: sub.vaultId,
      ownerAddress: sub.ownerAddress,
      shareAmount,
    });
    const vaultMeta = await getVault(sub.vaultId);
    const chain = chainFromVaultChainId(vaultMeta.chainId);
    const hashes = await executeTxSteps(built.steps, auth.orgId, chain);
    const requestTxHash = hashes[hashes.length - 1] ?? null;

    let redeemRequestId = "";
    try {
      const statusPayload = await requestStatus({
        vaultId: sub.vaultId,
        ownerAddress: sub.ownerAddress,
      });
      redeemRequestId = extractRedeemRequest(statusPayload)?.requestId ?? "";
    } catch {
      // subgraph lag is ok — refresh later
    }

    const db = getDb();
    await db
      .update(subscriptions)
      .set({
        status: "RedeemPending",
        shares: liveShares,
        metadata: withRedeemMeta(sub, {
          requestId: redeemRequestId || undefined,
          requestTxHash: requestTxHash ?? undefined,
          settlement: String(built.settlement ?? "queued"),
        }),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
    await db.insert(auditEvents).values({
      orgId: auth.orgId,
      subscriptionId: sub.id,
      event: "Redeem requested",
      detail: `${shareAmount} shares queued · tx ${requestTxHash ?? "n/a"} · not USDC yet`,
      tone: "warn",
    });

    return {
      status: "RedeemPending" as const,
      requestTxHash,
      redeemRequestId: redeemRequestId || null,
      settlement: String(built.settlement ?? "queued"),
      message:
        "Redeem queued on IXS. Instant maxRedeem stays 0 until their cycle settles (often ~1–2 days on this vault). Refresh, then claim/withdraw.",
    };
  });

/** Claim redeem assets when IXS marks the redeem request claimable. */
export const claimRedeemFn = createServerFn({ method: "POST" })
  .validator(z.object({ subscriptionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const sub = await getSubscriptionForOrg(auth, data.subscriptionId);
    if (sub.status !== "RedeemPending" && sub.status !== "RedeemClaimable") {
      throw new Error("Subscription is not in a redeem claim state.");
    }

    const redeemMeta = readRedeemMeta(sub);
    const statusPayload = await requestStatus({
      vaultId: sub.vaultId,
      ownerAddress: sub.ownerAddress,
    });
    const redeemInfo = extractRedeemRequest(statusPayload, redeemMeta.requestId);
    const requestId = redeemInfo?.requestId || redeemMeta.requestId || "";
    if (!requestId) {
      throw new Error(
        "No redeem requestId yet. Wait for IXS subgraph indexing, then Refresh. Some vaults settle without a claim step — check AgentKit USDC and Withdraw.",
      );
    }

    const vaultMeta = await getVault(sub.vaultId);
    const chain = chainFromVaultChainId(vaultMeta.chainId);
    let claimTxHash: string | null = null;
    try {
      const built = await buildClaimRedeem({
        vaultId: sub.vaultId,
        ownerAddress: sub.ownerAddress,
        requestId,
      });
      const hashes = await executeTxSteps(built.steps, auth.orgId, chain);
      claimTxHash = hashes[hashes.length - 1] ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Vaults with no separate claim step surface this — treat wallet USDC as ready.
      if (!/no claim|sync vault|no separate claim|claim step/i.test(msg)) {
        throw err;
      }
    }

    const bal = await getWalletBalances(sub.ownerAddress as `0x${string}`, chain);
    const db = getDb();
    await db
      .update(subscriptions)
      .set({
        status: "RedeemClaimable",
        metadata: withRedeemMeta(sub, {
          requestId,
          claimTxHash: claimTxHash ?? undefined,
        }),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
    await db.insert(auditEvents).values({
      orgId: auth.orgId,
      subscriptionId: sub.id,
      event: claimTxHash ? "Redeem claimed" : "Redeem ready for withdraw",
      detail: claimTxHash
        ? `claim ${claimTxHash} · AgentKit USDC ${bal.usdc}`
        : `No separate claim step · AgentKit USDC ${bal.usdc}`,
      tone: "good",
    });

    return {
      status: "RedeemClaimable" as const,
      claimTxHash,
      walletUsdc: bal.usdc,
      message: "USDC should be in the AgentKit wallet. Enter your address and Withdraw.",
    };
  });

/** Send AgentKit USDC on the subscription's chain to an external EVM address. */
export const withdrawUsdcFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      subscriptionId: z.string().uuid(),
      toAddress: ethAddress,
      /** Human USDC amount; omit to send full liquid balance. */
      amountUsdc: z.number().positive().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const sub = await getSubscriptionForOrg(auth, data.subscriptionId);
    if (sub.status === "Withdrawn") throw new Error("Already marked withdrawn.");

    const vaultMeta = await getVault(sub.vaultId);
    const chain = chainFromVaultChainId(vaultMeta.chainId);
    const bal = await getWalletBalances(sub.ownerAddress as `0x${string}`, chain);
    const amountBase =
      data.amountUsdc != null
        ? usdcToBaseUnits(data.amountUsdc, bal.usdcDecimals)
        : bal.usdcRaw;
    if (amountBase <= 0n) {
      throw new Error(
        `No liquid USDC on ${bal.network} in AgentKit ${sub.ownerAddress}. If redeem is still queued, wait for IXS then Claim redeem.`,
      );
    }

    const sent = await transferUsdc({
      orgId: auth.orgId,
      chainId: chain,
      to: data.toAddress as `0x${string}`,
      amountBaseUnits: amountBase,
    });

    const position = await getPosition(sub.vaultId, sub.ownerAddress);
    const remainingShares = String(position.shareBalance ?? "0");
    const fullyOut = !positiveUnits(remainingShares);

    const db = getDb();
    await db
      .update(subscriptions)
      .set({
        status: fullyOut ? "Withdrawn" : sub.status,
        shares: remainingShares,
        metadata: withRedeemMeta(sub, {
          withdrawTxHash: sent.txHash,
          toAddress: data.toAddress,
        }),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
    await db.insert(auditEvents).values({
      orgId: auth.orgId,
      subscriptionId: sub.id,
      event: "USDC withdrawn",
      detail: `${sent.amount} USDC → ${data.toAddress} · ${sent.txHash}`,
      tone: "good",
    });

    return {
      status: fullyOut ? ("Withdrawn" as const) : (sub.status as SubscriptionStatus),
      txHash: sent.txHash,
      amount: sent.amount,
      to: data.toAddress,
      remainingShares,
      message: fullyOut
        ? "Withdrawn. Shares cleared and USDC sent."
        : "USDC sent. Vault still shows remaining shares — redeem the rest when ready.",
    };
  });
