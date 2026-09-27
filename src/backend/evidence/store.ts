/**
 * Neon-backed evidence ring for public /evidence.
 * Survives Vercel cold starts / multi-instance. Redacts wallets/secrets on read.
 *
 * Tor relay cannot run on Neon (Postgres only) — that stays on Cloud Run / tunnel.
 */
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { evidenceEntries, evidenceMeta } from "../db/schema";

export type EvidenceEntry = {
  id: string;
  at: string;
  kind: "onchain" | "mcp" | "serv" | "preflight" | "simulate" | "policy";
  label: string;
  chainId?: number | null;
  blockNumber?: number | null;
  request?: unknown;
  response?: unknown;
  ok: boolean;
};

const MAX = 200;
const LAST_SCAN_KEY = "last_scan";

const ADDR_RE = /0x[a-fA-F0-9]{40}/g;
const LONG_HEX_RE = /0x[a-fA-F0-9]{64,}/g;

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(ADDR_RE, "0x…").replace(LONG_HEX_RE, "0x…");
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (
        key.includes("key") ||
        key.includes("secret") ||
        key.includes("authorization") ||
        key.includes("private")
      ) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = redactValue(v);
    }
    return out;
  }
  return value;
}

function redactEntry(e: EvidenceEntry): EvidenceEntry {
  return {
    ...e,
    request: e.request === undefined ? undefined : redactValue(e.request),
    response: e.response === undefined ? undefined : redactValue(e.response),
  };
}

function rowToEntry(row: typeof evidenceEntries.$inferSelect): EvidenceEntry {
  return {
    id: row.id,
    at: row.createdAt.toISOString(),
    kind: row.kind as EvidenceEntry["kind"],
    label: row.label,
    chainId: row.chainId,
    blockNumber: row.blockNumber,
    request: row.request ?? undefined,
    response: row.response ?? undefined,
    ok: row.ok,
  };
}

/** Persist one evidence row to Neon. Soft-fails so deposit/scan paths stay primary. */
export async function recordEvidence(
  partial: Omit<EvidenceEntry, "id" | "at"> & { at?: string },
): Promise<EvidenceEntry> {
  const at = partial.at ?? new Date().toISOString();
  const fallback: EvidenceEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at,
    kind: partial.kind,
    label: partial.label,
    chainId: partial.chainId ?? null,
    blockNumber: partial.blockNumber ?? null,
    request: partial.request,
    response: partial.response,
    ok: partial.ok,
  };

  try {
    const db = getDb();
    const [row] = await db
      .insert(evidenceEntries)
      .values({
        kind: partial.kind,
        label: partial.label,
        chainId: partial.chainId ?? null,
        blockNumber: partial.blockNumber ?? null,
        request: partial.request ?? null,
        response: partial.response ?? null,
        ok: partial.ok,
        createdAt: new Date(at),
      })
      .returning();

    // Keep ring bounded (drop oldest beyond MAX)
    await db.execute(sql`
      DELETE FROM evidence_entries
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
          FROM evidence_entries
        ) ranked
        WHERE rn > ${MAX}
      )
    `);

    return row ? rowToEntry(row) : fallback;
  } catch (e) {
    console.error("[evidence] Neon persist failed:", e instanceof Error ? e.message : e);
    return fallback;
  }
}

export async function setLastScanEvidence(payload: unknown): Promise<void> {
  try {
    const db = getDb();
    await db
      .insert(evidenceMeta)
      .values({
        key: LAST_SCAN_KEY,
        value: payload,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: evidenceMeta.key,
        set: { value: payload, updatedAt: new Date() },
      });
  } catch (e) {
    console.error("[evidence] last_scan persist failed:", e instanceof Error ? e.message : e);
  }
}

export async function getEvidenceBundle() {
  const doctrine =
    "BOND records SERV inputs/outputs, IXS MCP probes, and on-chain reads with block numbers. Pending is not ownership. Live deposits require AgentKit signature + preflight ALLOCATE. Evidence is stored in Neon Postgres (durable across serverless instances) and redacts wallets/secrets on the public page.";

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(evidenceEntries)
      .orderBy(desc(evidenceEntries.createdAt))
      .limit(100);
    const meta = await db
      .select()
      .from(evidenceMeta)
      .where(eq(evidenceMeta.key, LAST_SCAN_KEY))
      .limit(1);
    const lastScan = meta[0]?.value ?? null;

    return {
      generatedAt: new Date().toISOString(),
      ephemeral: false as const,
      durable: "neon" as const,
      doctrine,
      lastScan: lastScan === null ? null : redactValue(lastScan),
      entries: rows.map((r) => redactEntry(rowToEntry(r))),
    };
  } catch (e) {
    console.error("[evidence] Neon read failed:", e instanceof Error ? e.message : e);
    return {
      generatedAt: new Date().toISOString(),
      ephemeral: true as const,
      durable: "unavailable" as const,
      doctrine,
      lastScan: null,
      entries: [] as EvidenceEntry[],
      error: "Evidence store temporarily unavailable.",
    };
  }
}
