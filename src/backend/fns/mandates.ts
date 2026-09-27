import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { mandates, auditEvents } from "../db/schema";
import { requireAuth } from "../auth/session";
import { dollarsToCents, centsToDollars } from "../../lib/status";
import { primaryVaultId, secondaryBnbVaultId } from "../ixs/client";

export const listMandatesFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  const db = getDb();
  const rows = await db
    .select()
    .from(mandates)
    .where(eq(mandates.orgId, auth.orgId))
    .orderBy(desc(mandates.createdAt));
  return rows.map((m) => ({
    ...m,
    monthlyLimit: centsToDollars(m.monthlyLimitCents),
    used: centsToDollars(m.usedCents),
    remaining: centsToDollars(m.monthlyLimitCents - m.usedCents),
  }));
});

export const createMandateFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2).max(80),
      monthlyLimitDollars: z.number().min(100).max(10_000_000),
      asset: z.literal("USDC"),
      network: z.enum(["Avalanche", "BNB Chain"]),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const vaultId =
      data.network === "BNB Chain" ? secondaryBnbVaultId() : primaryVaultId();
    const db = getDb();
    const [row] = await db
      .insert(mandates)
      .values({
        orgId: auth.orgId,
        name: data.name,
        asset: data.asset,
        network: data.network,
        vaultId,
        monthlyLimitCents: dollarsToCents(data.monthlyLimitDollars),
        status: "active",
      })
      .returning();
    await db.insert(auditEvents).values({
      orgId: auth.orgId,
      event: "Mandate created",
      detail: `${data.name} · $${data.monthlyLimitDollars} USDC · ${data.network}`,
      tone: "good",
    });
    return row;
  });

export const updateMandateStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ mandateId: z.string().uuid(), status: z.enum(["active", "draft", "paused"]) }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const db = getDb();
    const updated = await db
      .update(mandates)
      .set({ status: data.status })
      .where(and(eq(mandates.id, data.mandateId), eq(mandates.orgId, auth.orgId)))
      .returning();
    if (!updated[0]) throw new Error("Mandate not found.");
    return updated[0];
  });
