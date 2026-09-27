import { eq, and, gt } from "drizzle-orm";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { getDb } from "../db/client";
import { sessions, users, orgs, memberships } from "../db/schema";
import { hashToken, newSessionToken } from "./password";

export const SESSION_COOKIE = "bond_session";
const SESSION_DAYS = 14;

export type AuthContext = {
  sessionId: string;
  userId: string;
  orgId: string;
  email: string;
  displayName: string;
  orgName: string;
  orgSlug: string;
  role: string;
};

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (≥32 chars).");
  }
  return secret;
}

export async function createSession(userId: string, orgId: string): Promise<string> {
  requireSessionSecret();
  const token = newSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = getDb();
  await db.insert(sessions).values({ tokenHash, userId, orgId, expiresAt });
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const tokenHash = hashToken(token);
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  setCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = hashToken(token);
  const db = getDb();
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      orgId: orgs.id,
      email: users.email,
      displayName: users.displayName,
      orgName: orgs.name,
      orgSlug: orgs.slug,
      role: memberships.role,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(orgs, eq(sessions.orgId, orgs.id))
    .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.orgId, orgs.id)))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]
    ? {
        sessionId: rows[0].sessionId,
        userId: rows[0].userId,
        orgId: rows[0].orgId,
        email: rows[0].email,
        displayName: rows[0].displayName,
        orgName: rows[0].orgName,
        orgSlug: rows[0].orgSlug,
        role: rows[0].role,
      }
    : null;
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized: sign in required.");
  return ctx;
}
