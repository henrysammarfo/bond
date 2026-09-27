export function ixsApiBase(): string {
  return process.env.IXS_API_BASE_URL ?? "https://api-v2.ixs.finance";
}

export function ixsMcpUrl(): string {
  return process.env.IXS_MCP_URL ?? "https://api-v2.ixs.finance/mcp";
}

export function primaryVaultId(): string {
  return process.env.IXS_PRIMARY_VAULT_ID ?? "6a952729732c2b84b55ce89d";
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
  return ixsFetch<IxsPosition>(`/vaults/${vaultId}/positions/${wallet}`);
}

export function vaultToPublicCard(v: IxsVault) {
  return {
    id: v.id,
    name: v.name,
    network: v.chainName || v.network,
    chainId: v.chainId,
    asset: v.underlyingAsset.symbol,
    minimum: "$100",
    address: v.contractAddress,
    status: v.status === "active" ? "Open" : v.status,
    description:
      v.chainId === 43114
        ? "Asynchronous ERC-7540 route to a licensed bond strategy on Avalanche. Shares appear only after vault processing."
        : "Mainnet vault listed for browse/compare. Primary hackathon deposit path is Avalanche.",
    requiresWhitelist: v.requiresWhitelist,
    decimals: v.underlyingAsset.decimals,
    assetAddress: v.underlyingAsset.address,
    explorerUrl: v.explorerUrl,
    rpcUrl: v.rpcUrl,
  };
}
