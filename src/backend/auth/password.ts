import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

/** Password hashing via Node scrypt (portable; no native argon2 binary). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = parts[4];
  const expectedHex = parts[5];
  const derived = scryptSync(password, salt, KEYLEN, { N, r, p });
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
