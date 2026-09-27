import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type TransactionRequest,
  formatEther,
  formatUnits,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche, bsc } from "viem/chains";
import type { TxStep } from "../ixs/mcp";
import { resolveOrgSecrets } from "../org/integrations";
import { usdcToBaseUnits } from "../../lib/status";

/**
 * AgentKit / CDP EVM signer.
 * Same secp256k1 address works on Avalanche (43114) and BNB Chain (56).
 * Prefer org-scoped private key; fall back to platform AGENT_PRIVATE_KEY.
 */

const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as const;
/** Binance-pegged USDC on BSC (IXS BNB vault underlying). */
const BSC_USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as const;

const ERC20_BALANCE_OF = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export type SignerContext = {
  privateKey: Hex;
  address: `0x${string}`;
  source: "org" | "platform";
};

export type DepositChain = "avalanche" | "bsc";

function chainFor(id: DepositChain): Chain {
  return id === "bsc" ? bsc : avalanche;
}

function rpcFor(id: DepositChain): string {
  if (id === "bsc") {
    return process.env.BSC_RPC_URL ?? "https://bsc-dataseed.binance.org";
  }
  return process.env.AVALANCHE_RPC_URL ?? "https://api.avax.network/ext/bc/C/rpc";
}

function usdcFor(id: DepositChain): `0x${string}` {
  return id === "bsc" ? BSC_USDC : AVALANCHE_USDC;
}

function publicClient(chainId: DepositChain = "avalanche") {
  return createPublicClient({
    chain: chainFor(chainId),
    transport: http(rpcFor(chainId)),
  });
}

function platformPrivateKey(): Hex {
  const raw = process.env.AGENT_PRIVATE_KEY ?? process.env.CDP_WALLET_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "No AgentKit signer. Connect your own agent key in Settings → Integrations, or set platform AGENT_PRIVATE_KEY.",
    );
  }
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

export async function resolveSigner(orgId?: string): Promise<SignerContext> {
  if (orgId) {
    const secrets = await resolveOrgSecrets(orgId);
    if (secrets.agentPrivateKey && secrets.agentWalletAddress) {
      return {
        privateKey: secrets.agentPrivateKey,
        address: secrets.agentWalletAddress,
        source: secrets.sources.agent === "org" ? "org" : "platform",
      };
    }
  }
  const privateKey = platformPrivateKey();
  const derived = privateKeyToAccount(privateKey).address;
  const address = process.env.CDP_WALLET_ADDRESS?.startsWith("0x")
    ? (process.env.CDP_WALLET_ADDRESS as `0x${string}`)
    : derived;
  if (address.toLowerCase() !== derived.toLowerCase()) {
    throw new Error(
      `CDP_WALLET_ADDRESS (${address}) does not match AGENT_PRIVATE_KEY (${derived}).`,
    );
  }
  return { privateKey, address, source: "platform" };
}

export async function getWalletAddress(orgId?: string): Promise<`0x${string}`> {
  return (await resolveSigner(orgId)).address;
}

function usdcDecimals(chainId: DepositChain): number {
  return chainId === "bsc" ? 18 : 6;
}

export async function getWalletBalances(
  address: `0x${string}`,
  chainId: DepositChain = "avalanche",
) {
  const client = publicClient(chainId);
  const usdc = usdcFor(chainId);
  const decimals = usdcDecimals(chainId);
  const [nativeWei, usdcRaw] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: usdc,
      abi: ERC20_BALANCE_OF,
      functionName: "balanceOf",
      args: [address],
    }),
  ]);
  return {
    address,
    network: chainId === "bsc" ? "BNB Chain" : "Avalanche C-Chain",
    chainId: chainId === "bsc" ? 56 : 43114,
    avax: chainId === "avalanche" ? formatEther(nativeWei) : "0",
    bnb: chainId === "bsc" ? formatEther(nativeWei) : "0",
    native: formatEther(nativeWei),
    usdc: formatUnits(usdcRaw, decimals),
    usdcRaw,
    nativeWei,
    avaxWei: chainId === "avalanche" ? nativeWei : 0n,
    usdcAddress: usdc,
    usdcDecimals: decimals,
  };
}

export function chainFromVaultChainId(chainId: number): DepositChain {
  if (chainId === 56) return "bsc";
  if (chainId === 43114) return "avalanche";
  throw new Error(`Unsupported vault chainId ${chainId}. BOND deposits Avalanche or BNB Chain only.`);
}

/** Preflight before live deposit — fail closed with actionable errors. */
export async function assertDepositFunding(
  address: `0x${string}`,
  amountDollars: number,
  chainId: DepositChain = "avalanche",
): Promise<void> {
  const bal = await getWalletBalances(address, chainId);
  const needUsdc = usdcToBaseUnits(amountDollars, bal.usdcDecimals);
  const gasName = chainId === "bsc" ? "BNB" : "AVAX";
  if (bal.usdcRaw < needUsdc) {
    throw new Error(
      `Insufficient USDC on ${bal.network}: wallet has ${bal.usdc} USDC, need ≥ ${amountDollars}. Fund ${address} with USDC ${bal.usdcAddress} before deposit.`,
    );
  }
  if (bal.nativeWei === 0n) {
    throw new Error(
      `Insufficient ${gasName} for gas: balance is 0. Fund ${address} on ${bal.network} before deposit.`,
    );
  }
}

function stepToTx(step: TxStep): TransactionRequest {
  // IXS MCP may flatten fields or nest them under `tx` (erc20_approve_exact / requestDeposit).
  const nested = (step as { tx?: Record<string, unknown> }).tx;
  const to = (step.to ??
    step.contractAddress ??
    step.target ??
    nested?.to ??
    nested?.contractAddress ??
    nested?.target) as string | undefined;
  const data = (step.data ??
    step.calldata ??
    step.input ??
    nested?.data ??
    nested?.calldata ??
    nested?.input) as string | undefined;
  const valueRaw = step.value ?? nested?.value;
  if (!to || !data) {
    throw new Error(`IXS step missing to/data: ${JSON.stringify(step)}`);
  }
  return {
    to: to as `0x${string}`,
    data: data as Hex,
    value: valueRaw ? BigInt(String(valueRaw)) : 0n,
  };
}

export async function executeTxSteps(
  steps: TxStep[],
  orgId?: string,
  chainId: DepositChain = "avalanche",
): Promise<string[]> {
  const signer = await resolveSigner(orgId);
  const account = privateKeyToAccount(signer.privateKey);
  const wallet = createWalletClient({
    account,
    chain: chainFor(chainId),
    transport: http(rpcFor(chainId)),
  });
  const public_ = publicClient(chainId);
  const hashes: string[] = [];
  for (const step of steps) {
    const tx = stepToTx(step);
    const hash = await wallet.sendTransaction({
      to: tx.to!,
      data: tx.data,
      value: tx.value ?? 0n,
    });
    hashes.push(hash);
    await public_.waitForTransactionReceipt({ hash });
  }
  return hashes;
}
