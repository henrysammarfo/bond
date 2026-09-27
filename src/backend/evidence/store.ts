/**
 * In-memory evidence ring for public /evidence (per-instance; ephemeral on serverless).
 * Redacts wallet addresses and long hex blobs before public read.
 */
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
const entries: EvidenceEntry[] = [];
let lastScan: unknown = null;

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

export function recordEvidence(
  partial: Omit<EvidenceEntry, "id" | "at"> & { at?: string },
): EvidenceEntry {
  const entry: EvidenceEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: partial.at ?? new Date().toISOString(),
    kind: partial.kind,
    label: partial.label,
    chainId: partial.chainId ?? null,
    blockNumber: partial.blockNumber ?? null,
    request: partial.request,
    response: partial.response,
    ok: partial.ok,
  };
  entries.unshift(entry);
  if (entries.length > MAX) entries.length = MAX;
  return entry;
}

export function setLastScanEvidence(payload: unknown) {
  lastScan = payload;
}

export function getEvidenceBundle() {
  return {
    generatedAt: new Date().toISOString(),
    ephemeral: true as const,
    doctrine:
      "BOND records SERV inputs/outputs, IXS MCP probes, and on-chain reads with block numbers. Pending is not ownership. Live deposits require AgentKit signature + preflight ALLOCATE. This public ring is in-memory per server instance (ephemeral on serverless) and redacts wallets/secrets.",
    lastScan: lastScan === null ? null : redactValue(lastScan),
    entries: entries.slice(0, 100).map(redactEntry),
  };
}
