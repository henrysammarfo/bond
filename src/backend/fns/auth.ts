import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { users, orgs, memberships } from "../db/schema";
import { hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroySession, getAuthContext, requireAuth } from "../auth/session";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().min(2).max(80),
  orgName: z.string().min(2).max(120),
});

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuthContext();
  if (!auth) return { authenticated: false as const };
  return {
    authenticated: true as const,
    user: {
      id: auth.userId,
      email: auth.email,
      displayName: auth.displayName,
    },
    org: {
      id: auth.orgId,
      name: auth.orgName,
      slug: auth.orgSlug,
      role: auth.role,
    },
  };
});

export const registerFn = createServerFn({ method: "POST" })
  .validator(registerSchema)
  .handler(async ({ data }) => {
    const db = getDb();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);
    if (existing[0]) throw new Error("An account with this email already exists.");
    const slug =
      data.orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "treasury";
    const passwordHash = hashPassword(data.password);
    const [org] = await db
      .insert(orgs)
      .values({ name: data.orgName, slug: `${slug}-${Date.now().toString(36)}` })
      .returning();
    const [user] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.displayName,
      })
      .returning();
    await db.insert(memberships).values({ orgId: org.id, userId: user.id, role: "owner" });
    await createSession(user.id, org.id);
    return { ok: true as const, orgId: org.id, userId: user.id };
  });

export const loginFn = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    const db = getDb();
    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);
    const user = found[0];
    if (!user || !verifyPassword(data.password, user.passwordHash)) {
      throw new Error("Invalid email or password.");
    }
    const membership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);
    if (!membership[0]) throw new Error("User has no organization membership.");
    await createSession(user.id, membership[0].orgId);
    return { ok: true as const };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return { ok: true as const };
});

export const requireSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  return requireAuth();
});
