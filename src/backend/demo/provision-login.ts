import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { users, memberships } from "../db/schema";
import { hashPassword } from "../auth/password";
import { ensureOrgAgentWallet } from "../org/integrations";

export async function provisionDemoLogin() {
  const email = (process.env.DEMO_EMAIL || "demo@bond.app").toLowerCase();
  const password = process.env.DEMO_PASSWORD;
  const displayName = process.env.DEMO_DISPLAY_NAME || "OpenServ Judge";

  if (!password || password.length < 10) {
    throw new Error("DEMO_PASSWORD is not configured (≥10 chars required).");
  }

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({ passwordHash: hashPassword(password), displayName })
      .where(eq(users.email, email));
    const mem = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, existing[0].id))
      .limit(1);
    const agent = mem[0] ? await ensureOrgAgentWallet(mem[0].orgId) : null;
    return {
      ok: true as const,
      mode: "reset" as const,
      email,
      orgId: mem[0]?.orgId ?? null,
      agentAddress: agent?.address ?? null,
    };
  }

  throw new Error(
    `Demo user ${email} does not exist. Create it once via scripts/provision-demo-login.ts.`,
  );
}
