import { getVault } from "./client";

export type SubgraphRedeemRequest = {
  id: string;
  requestId: string;
  owner: string;
  receiver: string;
  shares: string;
  assetsAtRequest: string;
  status: string;
  requestedAt: string;
  requestedTxHash: string;
  processedAt: string | null;
  processedTxHash: string | null;
  grossAssets: string | null;
  feeAssets: string | null;
  netAssets: string | null;
  vault: string;
};

export type SubgraphDepositRequest = {
  id: string;
  requestId: string;
  owner: string;
  shares: string | null;
  assets: string | null;
  status: string;
  [key: string]: unknown;
};

async function gql<T>(url: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`IXS subgraph ${res.status}: ${text || res.statusText}`);
  }
  const parsed = (await res.json()) as { data?: T; errors?: Array<{ message?: string }> };
  if (parsed.errors?.length) {
    throw new Error(parsed.errors.map((e) => e.message ?? "subgraph error").join("; "));
  }
  if (!parsed.data) throw new Error("IXS subgraph returned no data.");
  return parsed.data;
}

function normalizeOwner(address: string): string {
  return address.toLowerCase();
}

/** Read redeem requests from the vault's Goldsky subgraph (works on BSC + Avalanche). */
export async function listRedeemRequests(params: {
  vaultId: string;
  ownerAddress: string;
}): Promise<SubgraphRedeemRequest[]> {
  const vault = await getVault(params.vaultId);
  const subgraphUrl = (vault as { subgraphUrl?: string }).subgraphUrl;
  if (!subgraphUrl) return [];

  const owner = normalizeOwner(params.ownerAddress);
  const data = await gql<{ redeemRequests: SubgraphRedeemRequest[] }>(
    subgraphUrl,
    `query ($owner: Bytes!) {
      redeemRequests(where: { owner: $owner }, orderBy: requestedAt, orderDirection: desc, first: 25) {
        id
        requestId
        owner
        receiver
        shares
        assetsAtRequest
        status
        requestedAt
        requestedTxHash
        processedAt
        processedTxHash
        grossAssets
        feeAssets
        netAssets
        vault
      }
    }`,
    { owner },
  );
  return data.redeemRequests ?? [];
}

/** Avalanche ERC-7540 subgraph also exposes depositRequests; BSC managed vault may not. */
export async function listDepositRequests(params: {
  vaultId: string;
  ownerAddress: string;
}): Promise<SubgraphDepositRequest[]> {
  const vault = await getVault(params.vaultId);
  const subgraphUrl = (vault as { subgraphUrl?: string }).subgraphUrl;
  if (!subgraphUrl) return [];

  const owner = normalizeOwner(params.ownerAddress);
  try {
    const data = await gql<{ depositRequests: SubgraphDepositRequest[] }>(
      subgraphUrl,
      `query ($owner: Bytes!) {
        depositRequests(where: { owner: $owner }, orderBy: requestedAt, orderDirection: desc, first: 25) {
          id
          requestId
          owner
          status
        }
      }`,
      { owner },
    );
    return data.depositRequests ?? [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/has no field `?depositRequests`?/i.test(msg) || /Cannot query field/i.test(msg)) {
      return [];
    }
    throw err;
  }
}

/**
 * Unified request status for refresh/claim — prefers live subgraph over flaky MCP
 * (BSC subgraph has no depositRequests; MCP still queries it and errors).
 */
export async function requestStatusFromSubgraph(params: {
  vaultId: string;
  ownerAddress: string;
}): Promise<Record<string, unknown>> {
  const [redeemRequests, depositRequests] = await Promise.all([
    listRedeemRequests(params),
    listDepositRequests(params),
  ]);

  const latestRedeem = redeemRequests[0] ?? null;
  const claimable =
    latestRedeem != null &&
    /finalized|claimable|fulfilled|processed|settled/i.test(latestRedeem.status);

  return {
    source: "subgraph",
    redeemRequests: redeemRequests.map((r) => ({
      ...r,
      type: "redeem",
      claimable: /finalized|claimable|fulfilled|processed|settled/i.test(r.status),
    })),
    depositRequests,
    requestId: latestRedeem?.requestId ?? "",
    status: latestRedeem?.status ?? "",
    claimable,
  };
}
