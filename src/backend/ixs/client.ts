export function ixsApiBase(): string {
  return process.env.IXS_API_BASE_URL ?? "https://api-v2.ixs.finance";
}

export function ixsMcpUrl(): string {
  return process.env.IXS_MCP_URL ?? "https://api-v2.ixs.finance/mcp";
}

export function primaryVaultId(): string {
  return process.env.IXS_PRIMARY_VAULT_ID ?? "6a952729732c2b84b55ce89d";
}

/** Permissionless BNB Chain companion vault (same IXHYB product family). */
export function secondaryBnbVaultId(): string {
  return process.env.IXS_BNB_VAULT_ID ?? "6a26624ca7d16b245d665475";
}

export function depositableVaultIds(): Set<string> {
  return new Set([primaryVaultId(), secondaryBnbVaultId()]);
}

export type IxsUnderlyingAsset = {
  symbol: string;
  decimals: number;
  address: string;
};

export type IxsVault = {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  network: string;
  chainName: string;
  contractAddress: string;
  explorerUrl: string;
  rpcUrl: string;
  underlyingAsset: IxsUnderlyingAsset;
  requiresWhitelist: boolean;
  status: string;
  ttm?: number | null;
  actions?: string[];
};

export type IxsPosition = {
  assetBalance?: string;
  shareBalance?: string;
  allowance?: string;
  maxWithdraw?: string;
  maxRedeem?: string;
  [key: string]: unknown;
};

async function ixsFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${ixsApiBase()}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`IXS ${path} failed (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function listVaults(): Promise<IxsVault[]> {
  const data = await ixsFetch<{ items: IxsVault[] } | IxsVault[]>("/vaults");
  return Array.isArray(data) ? data : data.items;
}

export async function getVault(vaultId: string): Promise<IxsVault> {
  const data = await ixsFetch<{ vault: IxsVault } | IxsVault>(`/vaults/${vaultId}`);
  return "vault" in data && data.vault ? data.vault : (data as IxsVault);
}

export async function getPosition(vaultId: string, wallet: string): Promise<IxsPosition> {
  const raw = await ixsFetch<IxsPosition | { position: Record<string, unknown> }>(
    `/vaults/${vaultId}/positions/${wallet}`,
  );
  return normalizePosition(raw);
}

/** Flatten IXS position payloads (nested `position.balances.*` or flat fields). */
export function normalizePosition(raw: unknown): IxsPosition {
  const root = (raw ?? {}) as Record<string, unknown>;
  const pos = (root.position && typeof root.position === "object"
    ? (root.position as Record<string, unknown>)
    : root) as Record<string, unknown>;
  const balances = (pos.balances && typeof pos.balances === "object"
    ? (pos.balances as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const limits = (pos.limits && typeof pos.limits === "object"
    ? (pos.limits as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const pickUnits = (node: unknown): string | undefined => {
    if (node == null) return undefined;
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (typeof node === "object") {
      const o = node as Record<string, unknown>;
      if (o.baseUnits != null) return String(o.baseUnits);
      if (o.display != null) {
        const d = String(o.display).split(/\s+/)[0];
        return d || undefined;
      }
    }
    return undefined;
  };

  const shareBalance =
    pickUnits(balances.shares) ??
    pickUnits(pos.shareBalance) ??
    pickUnits(pos.shares) ??
    pickUnits(pos.share_balance) ??
    "0";
  const assetBalance =
    pickUnits(balances.asset) ?? pickUnits(pos.assetBalance) ?? pickUnits(pos.assets) ?? "0";
  const maxRedeem =
    pickUnits(limits.maxRedeem) ?? pickUnits(pos.maxRedeem) ?? pickUnits(pos.max_redeem) ?? "0";
  const maxWithdraw =
    pickUnits(limits.maxWithdraw) ??
    pickUnits(pos.maxWithdraw) ??
    pickUnits(pos.max_withdraw) ??
    "0";
  const shareValue =
    pickUnits((balances as { shareValueInAssets?: unknown }).shareValueInAssets) ??
    pickUnits(pos.shareValueInAssets) ??
    undefined;

  return {
    ...pos,
    shareBalance,
    assetBalance,
    maxRedeem,
    maxWithdraw,
    shareValueInAssets: shareValue,
  };
}

export function vaultRole(v: IxsVault): "primary" | "secondary" | "whitelist" | "other" {
  if (v.id === primaryVaultId()) return "primary";
  if (v.id === secondaryBnbVaultId()) return "secondary";
  if (v.requiresWhitelist) return "whitelist";
  return "other";
}

export function vaultToPublicCard(v: IxsVault) {
  const role = vaultRole(v);
  const depositable = depositableVaultIds().has(v.id) && !v.requiresWhitelist;
  const chainLabel =
    v.chainId === 43114 ? "Avalanche C-Chain" : v.chainId === 56 ? "BNB Chain" : v.chainName;
  return {
    id: v.id,
    name: v.name,
    network: chainLabel || v.network,
    chainId: v.chainId,
    asset: v.underlyingAsset.symbol,
    minimum: "$104",
    address: v.contractAddress,
    status: v.status === "active" ? "Open" : v.status,
    ttm: v.ttm ?? null,
    role,
    depositable,
    description:
      role === "primary"
        ? "Primary subscribe path. Async ERC-7540 on Avalanche. Shares appear only after IXS processing — Pending until then."
        : role === "secondary"
          ? "Companion permissionless vault on BNB Chain. Same AgentKit address works across EVM; fund BSC USDC + BNB gas to subscribe."
          : v.requiresWhitelist
            ? "Listed live from IXS. Whitelist required — browse and compare only until your org is approved."
            : "Live IXS vault listing for compare.",
    requiresWhitelist: v.requiresWhitelist,
    decimals: v.underlyingAsset.decimals,
    assetAddress: v.underlyingAsset.address,
    explorerUrl: v.explorerUrl,
    rpcUrl: v.rpcUrl,
    actions: v.actions ?? ["deposit", "redeem"],
  };
}
