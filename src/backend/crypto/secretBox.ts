/**
 * AES-256-GCM secret box for per-org integration keys.
 * Master key: INTEGRATIONS_ENCRYPTION_KEY or SESSION_SECRET (min 16 chars).
 * Wire format: `v1.<iv_b64>.<tag_b64>.<ct_b64>`
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function masterKey(): Buffer {
  const raw =
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() || process.env.SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY or SESSION_SECRET (≥16 chars) required to encrypt org secrets.",
    );
  }
  return createHash("sha256").update(raw).digest();
}

export function sealSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ct.toString("base64url")}`;
}

export function openSecret(sealed: string): string {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid sealed secret format.");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
