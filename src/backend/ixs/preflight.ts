/**
 * Deterministic IXS vault preflight — facts before SERV / deposit.
 * Sources: IXS REST, IXS MCP, on-chain reads with block numbers.
 */
import {
  createPublicClient,
  formatUnits,
  http,
  parseAbi,
  type Address,
} from "viem";
import { avalanche, bsc } from "viem/chains";
import { getVault, type IxsVault } from "./client";
import { mcpToolCall, vaultGetMcp, buildRequestDeposit } from "./mcp";

const VAULT_READ_ABI = parseAbi([
  "function maxDeposit(address) view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function paused() view returns (bool)",
  "function priceUpdatedAt() view returns (uint256)",
  "function navStalenessThreshold() view returns (uint256)",
  "function minRedeemAssets() view returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function whitelistEnabled() view returns (bool)",
  "function whitelist(address) view returns (bool)",
]);

const UINT_MAX = 2n ** 256n - 1n;
/** Live floor so position stays redeemable after 0.5% fee + 3% NAV buffer. */
export const LIVE_REDEEMABLE_MIN_USD = 104;
export const MAX_VAULT_TVL_SHARE_PCT = 25;
export const NAV_STALE_POLICY_HOURS = 72;
export const IXS_MIN_DEPOSIT_USD = 100;

export type PreflightCheck = {
  key: string;
  label: string;
  ok: boolean;
  severity: "block" | "defer" | "info";
  value: string;
  detail: string;
  source: string;
};

export type VaultPreflight = {
  vaultId: string;
  name: string;
  chainId: number;
  network: string;
  address: Address;
  wallet: Address;
  blockNumber: number | null;
  checkedAt: string;
  verdict: "allocate" | "defer" | "reject";
  ok: boolean;
  checks: PreflightCheck[];
  depositLimitUsd: number | null;
  depositLimitUnlimited: boolean;
  totalAssetsUsd: number | null;
  tvlCapUsd: number | null;
  navAgeHours: number | null;
  navUpdatedAt: string | null;
  assetDecimals: number;
  liveRedeemableMinUsd: number;
  suggestedMaxUsd: number | null;
  mcpAccepts: boolean | null;
  mcpSettlement: string | null;
};

function rpcFor(chainId: number): string {
  if (chainId === 56) return process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
  return process.env.AVALANCHE_RPC_URL ?? "https://api.avax.network/ext/bc/C/rpc";
}

function clientFor(chainId: number) {
  return createPublicClient({
    chain: chainId === 56 ? bsc : avalanche,
    transport: http(rpcFor(chainId)),
  });
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "unknown";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;
}

async function checkWhitelistMcp(
  vaultId: string,
  wallet: string,
): Promise<boolean | null> {
  try {
    const raw = (await mcpToolCall("vault_check_whitelist", {
      vaultId,
      walletAddress: wallet,
      address: wallet,
    })) as Record<string, unknown>;
    if (typeof raw.whitelisted === "boolean") return raw.whitelisted;
    if (typeof raw.allowed === "boolean") return raw.allowed;
    if (typeof raw.isWhitelisted === "boolean") return raw.isWhitelisted;
    if (typeof raw.result === "boolean") return raw.result;
    return null;
  } catch {
    return null;
  }
}

export function liveRedeemableMinimumUsd(
  minRedeemAssetsUsd = 100,
  feeBps = 50,
  navBufferPct = 3,
): number {
  const afterFee = 1 - feeBps / 10_000;
  const withBuffer = minRedeemAssetsUsd / afterFee / (1 - navBufferPct / 100);
  return Math.ceil(withBuffer);
}

/**
 * Run deterministic preflight for one vault + wallet.
 * Does not call SERV — facts only. SERV turns facts into narrative/allocate.
 */
export async function runVaultPreflight(params: {
  vaultId: string;
  wallet: Address;
  amountUsd?: number;
  live?: boolean;
}): Promise<VaultPreflight> {
  const live = params.live === true;
  const vault = await getVault(params.vaultId);
  const decimals = vault.underlyingAsset.decimals ?? (vault.chainId === 56 ? 18 : 6);
  const client = clientFor(vault.chainId);
  const address = vault.contractAddress as Address;
  const wallet = params.wallet;

  const checks: PreflightCheck[] = [];
  let blockNumber: number | null = null;
  let maxDep: bigint | null = null;
  let totalAssets: bigint | null = null;
  let paused: boolean | null = null;
  let priceUpdatedAt: number | null = null;
  let navThresholdSec: number | null = null;
  let minRedeemAssets: bigint | null = null;
  let feeBps: number | null = null;
  let whitelistEnabled: boolean | null = null;
  let onchainWhitelist: boolean | null = null;

  try {
    blockNumber = Number(await client.getBlockNumber());
  } catch {
    blockNumber = null;
  }

  const read = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch {
      return null;
    }
  };

  maxDep = await read(() =>
    client.readContract({
      address,
      abi: VAULT_READ_ABI,
      functionName: "maxDeposit",
      args: [wallet],
    }),
  );
  totalAssets = await read(() =>
    client.readContract({ address, abi: VAULT_READ_ABI, functionName: "totalAssets" }),
  );
  paused = await read(() =>
    client.readContract({ address, abi: VAULT_READ_ABI, functionName: "paused" }),
  );
  const priceRaw = await read(() =>
    client.readContract({ address, abi: VAULT_READ_ABI, functionName: "priceUpdatedAt" }),
  );
  if (priceRaw != null) priceUpdatedAt = Number(priceRaw);
  const threshRaw = await read(() =>
    client.readContract({
      address,
      abi: VAULT_READ_ABI,
      functionName: "navStalenessThreshold",
    }),
  );
  if (threshRaw != null) navThresholdSec = Number(threshRaw);
  minRedeemAssets = await read(() =>
    client.readContract({ address, abi: VAULT_READ_ABI, functionName: "minRedeemAssets" }),
  );
  const feeRaw = await read(() =>
    client.readContract({ address, abi: VAULT_READ_ABI, functionName: "feeBps" }),
  );
  if (feeRaw != null) feeBps = Number(feeRaw);
  whitelistEnabled = await read(() =>
    client.readContract({ address, abi: VAULT_READ_ABI, functionName: "whitelistEnabled" }),
  );
  if (vault.requiresWhitelist || whitelistEnabled) {
    onchainWhitelist = await read(() =>
      client.readContract({
        address,
        abi: VAULT_READ_ABI,
        functionName: "whitelist",
        args: [wallet],
      }),
    );
  }

  const active = vault.status === "active" && paused !== true;
  checks.push({
    key: "status",
    label: "Vault status",
    ok: active,
    severity: "block",
    value: paused ? "paused" : vault.status,
    detail: paused
      ? "paused() is true on-chain"
      : `IXS Vault API status "${vault.status}"`,
    source: "IXS Vault API + paused()",
  });

  const needsWl = vault.requiresWhitelist || whitelistEnabled === true;
  let wl = needsWl ? onchainWhitelist : true;
  let wlSource = needsWl ? "whitelist(wallet) on-chain" : "open vault";
  if (needsWl && wl !== true) {
    const mcpWl = await checkWhitelistMcp(vault.id, wallet);
    if (mcpWl != null) {
      wl = mcpWl;
      wlSource = "IXS MCP vault_check_whitelist";
    }
  }
  const wlOk = needsWl ? wl === true : true;
  checks.push({
    key: "eligibility",
    label: "Eligibility",
    ok: wlOk,
    severity: "block",
    value: needsWl
      ? wl === true
        ? "whitelisted"
        : wl === false
          ? "not whitelisted"
          : "unknown"
      : "open vault",
    detail: needsWl
      ? "KYC whitelist enforced — deposit rejected until the wallet is approved"
      : "Permissionless vault — no whitelist gate",
    source: wlSource,
  });

  const nowSec = Math.floor(Date.now() / 1000);
  let navAgeHours: number | null = null;
  let navUpdatedAt: string | null = null;
  if (priceUpdatedAt && priceUpdatedAt > 0) {
    navAgeHours = (nowSec - priceUpdatedAt) / 3600;
    navUpdatedAt = new Date(priceUpdatedAt * 1000).toISOString();
  }
  const contractThreshHours =
    navThresholdSec != null && navThresholdSec > 0 ? navThresholdSec / 3600 : 48;
  const contractStale =
    navAgeHours != null && navAgeHours > contractThreshHours;
  const policyStale =
    navAgeHours != null && navAgeHours > NAV_STALE_POLICY_HOURS;
  const navOk = navAgeHours == null ? true : !contractStale && !policyStale;
  checks.push({
    key: "nav-age",
    label: "NAV freshness",
    ok: navOk,
    severity: "defer",
    value:
      navAgeHours == null
        ? "unknown (no priceUpdatedAt)"
        : `${navAgeHours.toFixed(1)} h ago`,
    detail:
      navAgeHours == null
        ? "Contract did not expose priceUpdatedAt — deposit limit is the live signal"
        : `Policy ${NAV_STALE_POLICY_HOURS} h · contract threshold ${contractThreshHours} h`,
    source: "priceUpdatedAt() + navStalenessThreshold()",
  });

  const unlimited = maxDep != null && maxDep >= UINT_MAX / 2n;
  const limitUsd =
    maxDep == null || unlimited ? null : Number(formatUnits(maxDep, decimals));
  const limitOk = unlimited || (limitUsd != null && limitUsd >= IXS_MIN_DEPOSIT_USD);
  checks.push({
    key: "deposit-limit",
    label: "Deposit limit",
    ok: limitOk,
    severity: needsWl && !wlOk ? "block" : "defer",
    value: maxDep == null ? "unknown" : unlimited ? "unlimited" : fmtUsd(limitUsd),
    detail:
      limitUsd === 0
        ? needsWl && !wlOk
          ? "maxDeposit is 0 because wallet is not whitelisted"
          : "maxDeposit is 0 — typically NAV stale; treat as temporarily paused (DEFER)"
        : `maxDeposit(wallet) on-chain at block ${blockNumber ?? "?"}`,
    source: `maxDeposit() · block ${blockNumber ?? "?"}`,
  });

  let mcpAccepts: boolean | null = null;
  let mcpSettlement: string | null = null;
  try {
    const meta = await vaultGetMcp(vault.id);
    mcpSettlement = String(meta.settlement ?? meta.settlementKind ?? "") || null;
    const probeAmt =
      decimals === 18
        ? (BigInt(IXS_MIN_DEPOSIT_USD) * 10n ** 18n).toString()
        : (BigInt(IXS_MIN_DEPOSIT_USD) * 1_000_000n).toString();
    await buildRequestDeposit({
      vaultId: vault.id,
      ownerAddress: wallet,
      assetAmount: probeAmt,
    });
    mcpAccepts = true;
  } catch (e) {
    mcpAccepts = false;
    checks.push({
      key: "mcp",
      label: "IXS MCP builds deposit",
      ok: false,
      severity: limitOk && wlOk ? "block" : "info",
      value: "refused",
      detail: e instanceof Error ? e.message : "MCP probe failed",
      source: "IXS MCP vault_build_request_deposit",
    });
  }
  if (mcpAccepts) {
    checks.push({
      key: "mcp",
      label: "IXS MCP builds deposit",
      ok: true,
      severity: "info",
      value: `builds approve + deposit (${mcpSettlement ?? "async"})`,
      detail: "vault_build_request_deposit returned calldata for the minimum size",
      source: "IXS MCP",
    });
  }

  const amount = params.amountUsd;
  const amountOk = amount == null ? true : amount >= IXS_MIN_DEPOSIT_USD;
  checks.push({
    key: "min-deposit",
    label: "Minimum deposit",
    ok: amountOk,
    severity: "block",
    value: `${IXS_MIN_DEPOSIT_USD} USDC`,
    detail:
      amount == null
        ? "IXS stated minimum is 100 USDC per request"
        : amountOk
          ? `Intended ${amount} USDC clears the minimum`
          : `Intended ${amount} USDC is below 100 USDC`,
    source: "IXS minimum",
  });

  const fee = feeBps ?? 50;
  const minRedeemUsd =
    minRedeemAssets != null
      ? Number(formatUnits(minRedeemAssets, decimals))
      : 100;
  const liveMin = liveRedeemableMinimumUsd(minRedeemUsd, fee, 3);
  const liveOk = !live || amount == null || amount >= liveMin;
  checks.push({
    key: "redeemable-min",
    label: "Live redeemable minimum",
    ok: liveOk,
    severity: live ? "block" : "info",
    value: `${liveMin} USDC`,
    detail: `ceil(${minRedeemUsd} / (1 − ${fee}bps) × 1.03). A ${IXS_MIN_DEPOSIT_USD} USDC deposit can mint shares that redeem under the min after the fee — live deposits use ${liveMin}+ USDC.`,
    source: "minRedeemAssets() + feeBps() + 3% NAV buffer",
  });

  const totalAssetsUsd =
    totalAssets == null ? null : Number(formatUnits(totalAssets, decimals));
  const tvlCapUsd =
    totalAssetsUsd == null
      ? null
      : Math.floor((totalAssetsUsd * MAX_VAULT_TVL_SHARE_PCT) / 100 * 100) / 100;
  let suggestedMaxUsd: number | null = null;
  if (tvlCapUsd != null) {
    suggestedMaxUsd = Math.max(0, tvlCapUsd);
    if (limitUsd != null && !unlimited) {
      suggestedMaxUsd = Math.min(suggestedMaxUsd, limitUsd);
    }
  }
  const tvlOk =
    amount == null || tvlCapUsd == null || amount <= tvlCapUsd || tvlCapUsd < IXS_MIN_DEPOSIT_USD;
  checks.push({
    key: "tvl-cap",
    label: `Vault concentration (≤${MAX_VAULT_TVL_SHARE_PCT}% TVL)`,
    ok: tvlCapUsd == null ? true : tvlCapUsd >= IXS_MIN_DEPOSIT_USD && tvlOk,
    severity: tvlCapUsd != null && tvlCapUsd < IXS_MIN_DEPOSIT_USD ? "defer" : "block",
    value: tvlCapUsd == null ? "unknown" : fmtUsd(tvlCapUsd),
    detail:
      totalAssetsUsd == null
        ? "totalAssets() unread"
        : tvlCapUsd < IXS_MIN_DEPOSIT_USD
          ? `Vault TVL ${fmtUsd(totalAssetsUsd)} — 25% cap under minimum; DEFER for capacity`
          : `One leg ≤ ${MAX_VAULT_TVL_SHARE_PCT}% of totalAssets() (${fmtUsd(totalAssetsUsd)}) before deposit`,
    source: `totalAssets() · block ${blockNumber ?? "?"}`,
  });

  const blocked = checks.some((c) => c.severity === "block" && !c.ok);
  const deferred = !blocked && checks.some((c) => c.severity === "defer" && !c.ok);

  return {
    vaultId: vault.id,
    name: vault.name,
    chainId: vault.chainId,
    network: vault.chainName || vault.network,
    address,
    wallet,
    blockNumber,
    checkedAt: new Date().toISOString(),
    verdict: blocked ? "reject" : deferred ? "defer" : "allocate",
    ok: !blocked && !deferred,
    checks,
    depositLimitUsd: limitUsd,
    depositLimitUnlimited: unlimited,
    totalAssetsUsd,
    tvlCapUsd,
    navAgeHours,
    navUpdatedAt,
    assetDecimals: decimals,
    liveRedeemableMinUsd: liveMin,
    suggestedMaxUsd,
    mcpAccepts,
    mcpSettlement,
  };
}

export async function runCatalogPreflight(params: {
  wallet: Address;
  vaultIds?: string[];
  amountUsd?: number;
  live?: boolean;
}): Promise<{ wallet: Address; checkedAt: string; results: VaultPreflight[] }> {
  const { listVaults, depositableVaultIds } = await import("./client");
  const all = await listVaults();
  const ids =
    params.vaultIds ??
    all
      .filter((v) => depositableVaultIds().has(v.id) || v.requiresWhitelist)
      .map((v) => v.id);
  const results: VaultPreflight[] = [];
  for (const id of ids) {
    try {
      results.push(
        await runVaultPreflight({
          vaultId: id,
          wallet: params.wallet,
          amountUsd: params.amountUsd,
          live: params.live,
        }),
      );
    } catch (e) {
      results.push({
        vaultId: id,
        name: id,
        chainId: 0,
        network: "unknown",
        address: "0x0000000000000000000000000000000000000000",
        wallet: params.wallet,
        blockNumber: null,
        checkedAt: new Date().toISOString(),
        verdict: "reject",
        ok: false,
        checks: [
          {
            key: "error",
            label: "Preflight error",
            ok: false,
            severity: "block",
            value: "failed",
            detail: e instanceof Error ? e.message : "unknown",
            source: "BOND preflight",
          },
        ],
        depositLimitUsd: null,
        depositLimitUnlimited: false,
        totalAssetsUsd: null,
        tvlCapUsd: null,
        navAgeHours: null,
        navUpdatedAt: null,
        assetDecimals: 6,
        liveRedeemableMinUsd: LIVE_REDEEMABLE_MIN_USD,
        suggestedMaxUsd: null,
        mcpAccepts: null,
        mcpSettlement: null,
      });
    }
  }
  return { wallet: params.wallet, checkedAt: new Date().toISOString(), results };
}

export function assertLiveDepositAmount(
  amountUsd: number,
  preflight: VaultPreflight,
): void {
  if (amountUsd < LIVE_REDEEMABLE_MIN_USD) {
    throw new Error(
      `Live deposit minimum is ${LIVE_REDEEMABLE_MIN_USD} USDC so the position stays redeemable after the ${preflight.checks.find((c) => c.key === "redeemable-min")?.value ?? "0.5% fee"} redeem fee.`,
    );
  }
  if (preflight.verdict === "reject") {
    const reason = preflight.checks.find((c) => !c.ok && c.severity === "block");
    throw new Error(`Preflight REJECT: ${reason?.detail ?? "vault blocked"}`);
  }
  if (preflight.verdict === "defer") {
    const reason = preflight.checks.find((c) => !c.ok && c.severity === "defer");
    throw new Error(`Preflight DEFER: ${reason?.detail ?? "vault temporarily paused"}`);
  }
  if (preflight.tvlCapUsd != null && amountUsd > preflight.tvlCapUsd) {
    throw new Error(
      `Amount ${amountUsd} USDC exceeds ${MAX_VAULT_TVL_SHARE_PCT}% of vault TVL (${preflight.tvlCapUsd} USDC). Cap the leg.`,
    );
  }
}

export type { IxsVault };
