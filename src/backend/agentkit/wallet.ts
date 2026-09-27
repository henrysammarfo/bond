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
import { resolveOrgSecrets } from "../org/integrations";

/**
 * AgentKit / CDP-backed Avalanche signer.
 * Prefer org-scoped private key from encrypted integrations vault;
 * fall back to platform AGENT_PRIVATE_KEY for demo/judges.
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

export type SignerContext = {
  privateKey: Hex;
  address: `0x${string}`;
  source: "org" | "platform";
};

function rpcUrl() {
  return process.env.AVALANCHE_RPC_URL ?? "https://api.avax.network/ext/bc/C/rpc";
}

function publicClient() {
  return createPublicClient({
    chain: avalanche,
    transport: http(rpcUrl()),
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
  const address = process.env.CDP_WALLET_ADDRESS?.startsWith("0x")
    ? (process.env.CDP_WALLET_ADDRESS as `0x${string}`)
    : privateKeyToAccount(privateKey).address;
  return { privateKey, address, source: "platform" };
}

export async function getWalletAddress(orgId?: string): Promise<`0x${string}`> {
  return (await resolveSigner(orgId)).address;
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
    usdcRaw,
    avaxWei,
    usdcAddress: AVALANCHE_USDC,
  };
}

/** Preflight before live deposit — fail closed with actionable errors. */
export async function assertDepositFunding(
  address: `0x${string}`,
  amountDollars: number,
): Promise<void> {
  const bal = await getWalletBalances(address);
  const needUsdc = BigInt(Math.round(amountDollars * 1e6));
  if (bal.usdcRaw < needUsdc) {
    throw new Error(
      `Insufficient USDC: wallet has ${bal.usdc} USDC, need ≥ ${amountDollars}. Fund ${address} on Avalanche (USDC ${AVALANCHE_USDC}) before deposit.`,
    );
  }
  if (bal.avaxWei === 0n) {
    throw new Error(
      `Insufficient AVAX for gas: balance is 0. Fund ${address} with Avalanche C-Chain AVAX before deposit.`,
    );
  }
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

export async function executeTxSteps(steps: TxStep[], orgId?: string): Promise<string[]> {
  const signer = await resolveSigner(orgId);
  const account = privateKeyToAccount(signer.privateKey);
  const wallet = createWalletClient({
    account,
    chain: avalanche,
    transport: http(rpcUrl()),
  });
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
