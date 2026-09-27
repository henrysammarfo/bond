import { and, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { mandates, subscriptions } from "./db/schema";
import type { AuthContext } from "./auth/session";

export function assertOrgOwns(auth: AuthContext, orgId: string): void {
  if (auth.orgId !== orgId) {
    throw new Error("Forbidden: cross-tenant access denied.");
  }
}

export async function getMandateForOrg(auth: AuthContext, mandateId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(mandates)
    .where(and(eq(mandates.id, mandateId), eq(mandates.orgId, auth.orgId)))
    .limit(1);
  if (!rows[0]) throw new Error("Mandate not found for this organization.");
  return rows[0];
}

export async function getSubscriptionForOrg(auth: AuthContext, subscriptionId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.orgId, auth.orgId)))
    .limit(1);
  if (!rows[0]) throw new Error("Subscription not found for this organization.");
  return rows[0];
}
