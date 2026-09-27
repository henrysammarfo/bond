import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type TransactionRequest,
  formatEther,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche } from "viem/chains";
import type { TxStep } from "../ixs/mcp";

/**
 * AgentKit / CDP-backed Avalanche signer.
 * Uses an EVM private key provisioned from Coinbase CDP / AgentKit wallet export
 * (`AGENT_PRIVATE_KEY` or `CDP_WALLET_PRIVATE_KEY`). Avoids bundling the full
 * @coinbase/agentkit graph into Cloudflare Workers.
 */

const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as const;
const ERC20_BALANCE_OF = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function requirePrivateKey(): Hex {
  const raw = process.env.AGENT_PRIVATE_KEY ?? process.env.CDP_WALLET_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "AGENT_PRIVATE_KEY (or CDP_WALLET_PRIVATE_KEY) must be set — export the AgentKit/CDP Avalanche wallet key into secrets.",
    );
  }
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  return key as Hex;
}

function rpcUrl() {
  return process.env.AVALANCHE_RPC_URL ?? "https://api.avax.network/ext/bc/C/rpc";
}

function publicClient() {
  return createPublicClient({
    chain: avalanche,
    transport: http(rpcUrl()),
  });
}

function walletClient() {
  const account = privateKeyToAccount(requirePrivateKey());
  return createWalletClient({
    account,
    chain: avalanche,
    transport: http(rpcUrl()),
  });
}

export async function getWalletAddress(): Promise<`0x${string}`> {
  if (process.env.CDP_WALLET_ADDRESS?.startsWith("0x")) {
    return process.env.CDP_WALLET_ADDRESS as `0x${string}`;
  }
  return privateKeyToAccount(requirePrivateKey()).address;
}

export async function getWalletBalances(address: `0x${string}`) {
  const client = publicClient();
  const [avaxWei, usdcRaw] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: AVALANCHE_USDC,
      abi: ERC20_BALANCE_OF,
      functionName: "balanceOf",
      args: [address],
    }),
  ]);
  return {
    address,
    network: "Avalanche C-Chain",
    chainId: 43114,
    avax: formatEther(avaxWei),
    usdc: formatUnits(usdcRaw, 6),
    usdcAddress: AVALANCHE_USDC,
  };
}

function stepToTx(step: TxStep): TransactionRequest {
  const to = (step.to ?? step.contractAddress ?? step.target) as string | undefined;
  const data = (step.data ?? step.calldata ?? step.input) as string | undefined;
  if (!to || !data) {
    throw new Error(`IXS step missing to/data: ${JSON.stringify(step)}`);
  }
  return {
    to: to as `0x${string}`,
    data: data as Hex,
    value: step.value ? BigInt(String(step.value)) : 0n,
  };
}

export async function executeTxSteps(steps: TxStep[]): Promise<string[]> {
  const wallet = walletClient();
  const public_ = publicClient();
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
