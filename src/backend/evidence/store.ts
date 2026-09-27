/**
 * In-memory evidence ring for public /evidence.
 * Every analyze / preflight / SERV call appends entries with block numbers.
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
    doctrine:
      "BOND records SERV inputs/outputs, IXS MCP probes, and on-chain reads with block numbers. Pending is not ownership. Live deposits require AgentKit signature + preflight ALLOCATE.",
    lastScan,
    entries: entries.slice(0, 100),
  };
}
