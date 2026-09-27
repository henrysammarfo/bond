import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { eq } from "drizzle-orm";
import { getDb } from "../src/backend/db/client.ts";
import { users, orgs, memberships } from "../src/backend/db/schema.ts";
import { hashPassword } from "../src/backend/auth/password.ts";
import { ensureOrgAgentWallet } from "../src/backend/org/integrations.ts";

const email = process.env.DEMO_EMAIL || "demo@bond.app";
const password = process.env.DEMO_PASSWORD;
const displayName = process.env.DEMO_DISPLAY_NAME || "OpenServ Judge";
const orgName = process.env.DEMO_ORG_NAME || "OpenServ Demo Treasury";

if (!password || password.length < 10) {
  console.error("Set DEMO_PASSWORD (≥10 chars). Refusing to use a hardcoded demo secret.");
  process.exit(1);
}


const db = getDb();
const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
if (existing[0]) {
  await db
    .update(users)
    .set({ passwordHash: hashPassword(password), displayName })
    .where(eq(users.email, email));
  const mem = await db.select().from(memberships).where(eq(memberships.userId, existing[0].id)).limit(1);
  let agent = null;
  if (mem[0]) agent = await ensureOrgAgentWallet(mem[0].orgId);
  console.log(JSON.stringify({ ok: true, mode: "reset", email, password, orgId: mem[0]?.orgId, agent }, null, 2));
} else {
  const slug = `openserv-demo-${Date.now().toString(36)}`;
  const [org] = await db.insert(orgs).values({ name: orgName, slug }).returning();
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: hashPassword(password), displayName })
    .returning();
  await db.insert(memberships).values({ orgId: org.id, userId: user.id, role: "owner" });
  const agent = await ensureOrgAgentWallet(org.id);
  console.log(JSON.stringify({ ok: true, mode: "created", email, password, orgId: org.id, agent }, null, 2));
}
