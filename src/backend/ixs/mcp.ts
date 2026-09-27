import { ixsMcpUrl } from "./client";

type JsonRpc = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
};

async function mcpCall<T>(body: JsonRpc): Promise<T> {
  const res = await fetch(ixsMcpUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`IXS MCP ${body.method} failed (${res.status}): ${text || res.statusText}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    const dataLine = text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data:"));
    if (!dataLine) throw new Error("IXS MCP returned empty SSE payload.");
    const parsed = JSON.parse(dataLine.slice(5).trim()) as {
      result?: T;
      error?: { message?: string };
    };
    if (parsed.error) throw new Error(parsed.error.message ?? "IXS MCP error");
    return parsed.result as T;
  }
  const parsed = (await res.json()) as { result?: T; error?: { message?: string } };
  if (parsed.error) throw new Error(parsed.error.message ?? "IXS MCP error");
  return parsed.result as T;
}

let mcpReady = false;

export async function ensureMcpInitialized(): Promise<void> {
  if (mcpReady) return;
  await mcpCall({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "bond", version: "1.0.0" },
    },
  });
  mcpReady = true;
}

export async function mcpToolsList(): Promise<unknown> {
  await ensureMcpInitialized();
  return mcpCall({ jsonrpc: "2.0", id: 2, method: "tools/list" });
}

export async function mcpToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  await ensureMcpInitialized();
  const result = await mcpCall<{
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: unknown;
  }>({
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name, arguments: args },
  });
  if (
    result &&
    typeof result === "object" &&
    "structuredContent" in result &&
    result.structuredContent
  ) {
    return result.structuredContent;
  }
  if (
    result &&
    typeof result === "object" &&
    Array.isArray((result as { content?: unknown }).content)
  ) {
    const text = (result as { content: Array<{ text?: string }> }).content
      .map((c) => c.text ?? "")
      .join("\n");
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return result;
}

export type TxStep = {
  type?: string;
  to?: string;
  data?: string;
  value?: string;
  chainId?: number;
  description?: string;
  [key: string]: unknown;
};

export async function vaultGetMcp(vaultId: string): Promise<Record<string, unknown>> {
  return (await mcpToolCall("vault_get", { vaultId })) as Record<string, unknown>;
}

export async function buildRequestDeposit(params: {
  vaultId: string;
  ownerAddress: string;
  assetAmount: string;
}): Promise<{ steps: TxStep[]; settlement?: string; [key: string]: unknown }> {
  const raw = (await mcpToolCall("vault_build_request_deposit", params)) as Record<string, unknown>;
  const steps = (raw.steps ?? raw.transactions ?? raw.txs ?? []) as TxStep[];
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("IXS vault_build_request_deposit returned no transaction steps.");
  }
  return { ...raw, steps, settlement: String(raw.settlement ?? "") };
}

export async function requestStatus(params: {
  vaultId: string;
  ownerAddress: string;
}): Promise<Record<string, unknown>> {
  return (await mcpToolCall("vault_request_status", params)) as Record<string, unknown>;
}

export async function buildClaimDeposit(params: {
  vaultId: string;
  ownerAddress: string;
  requestId: string;
}): Promise<{ steps: TxStep[]; [key: string]: unknown }> {
  const raw = (await mcpToolCall("vault_build_claim_deposit", params)) as Record<string, unknown>;
  const steps = (raw.steps ?? raw.transactions ?? raw.txs ?? []) as TxStep[];
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("IXS vault_build_claim_deposit returned no transaction steps.");
  }
  return { ...raw, steps };
}
