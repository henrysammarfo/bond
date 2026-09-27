/**
 * eth_call simulation of IXS MCP deposit steps against the real vault.
 * No broadcast — shares/gas estimate or revert reason only.
 */
import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  encodeFunctionData,
  parseAbi,
} from "viem";
import { avalanche, bsc } from "viem/chains";
import { buildRequestDeposit, type TxStep } from "./mcp";
import { recordEvidence } from "../evidence/store";
import { getVault } from "./client";

function rpcFor(chainId: number): string {
  if (chainId === 56) return process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
  return process.env.AVALANCHE_RPC_URL ?? "https://api.avax.network/ext/bc/C/rpc";
}

function stepCall(step: TxStep): { to: Address; data: Hex; value: bigint } {
  const to = (step.to ?? step.contractAddress ?? step.target) as string | undefined;
  const data = (step.data ?? step.calldata ?? step.input) as string | undefined;
  if (!to || !data) throw new Error(`IXS step missing to/data: ${JSON.stringify(step)}`);
  return {
    to: to as Address,
    data: data as Hex,
    value: step.value ? BigInt(String(step.value)) : 0n,
  };
}

export async function simulateDeposit(params: {
  vaultId: string;
  ownerAddress: Address;
  assetAmount: string;
}): Promise<{
  ok: boolean;
  blockNumber: number | null;
  chainId: number;
  steps: number;
  results: Array<{ index: number; ok: boolean; detail: string }>;
  builtSettlement: string | null;
}> {
  const vault = await getVault(params.vaultId);
  const client = createPublicClient({
    chain: vault.chainId === 56 ? bsc : avalanche,
    transport: http(rpcFor(vault.chainId)),
  });
  let blockNumber: number | null = null;
  try {
    blockNumber = Number(await client.getBlockNumber());
  } catch {
    blockNumber = null;
  }

  const built = await buildRequestDeposit({
    vaultId: params.vaultId,
    ownerAddress: params.ownerAddress,
    assetAmount: params.assetAmount,
  });

  const results: Array<{ index: number; ok: boolean; detail: string }> = [];
  for (let i = 0; i < built.steps.length; i++) {
    const call = stepCall(built.steps[i]!);
    try {
      await client.call({
        account: params.ownerAddress,
        to: call.to,
        data: call.data,
        value: call.value,
      });
      results.push({ index: i, ok: true, detail: `eth_call ok → ${call.to}` });
    } catch (e) {
      results.push({
        index: i,
        ok: false,
        detail: e instanceof Error ? e.message : "eth_call reverted",
      });
    }
  }

  const ok = results.every((r) => r.ok);
  recordEvidence({
    kind: "simulate",
    label: `eth_call deposit · ${vault.name}`,
    chainId: vault.chainId,
    blockNumber,
    request: {
      vaultId: params.vaultId,
      owner: params.ownerAddress,
      assetAmount: params.assetAmount,
    },
    response: { ok, results, settlement: built.settlement },
    ok,
  });

  return {
    ok,
    blockNumber,
    chainId: vault.chainId,
    steps: built.steps.length,
    results,
    builtSettlement: built.settlement ?? null,
  };
}

/** Unused helper kept for future share preview reads. */
export const previewDepositAbi = parseAbi([
  "function previewDeposit(uint256 assets) view returns (uint256 shares)",
]);

export function encodePreviewDeposit(assets: bigint): Hex {
  return encodeFunctionData({
    abi: previewDepositAbi,
    functionName: "previewDeposit",
    args: [assets],
  });
}
