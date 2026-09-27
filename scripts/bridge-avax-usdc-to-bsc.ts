#!/usr/bin/env bun
/**
 * Bridge Avalanche USDC → BSC (gas as native BNB + USDC for IXS subscribe) via LI.FI quotes.
 * LIVE money movement — requires AGENT_PRIVATE_KEY / CDP_WALLET_PRIVATE_KEY.
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  getAddress,
  formatUnits,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche, bsc } from "viem/chains";

const pkRaw = process.env.AGENT_PRIVATE_KEY || process.env.CDP_WALLET_PRIVATE_KEY;
if (!pkRaw) throw new Error("Missing AGENT_PRIVATE_KEY");
const pk = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as Hex;

const account = privateKeyToAccount(pk);
const wallet = getAddress(account.address);
const AVAX_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as Address;
const BSC_USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as Address;

const avaxRpc = process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const bscRpc = process.env.BSC_RPC_URL || process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org";

const avaxPublic = createPublicClient({ chain: avalanche, transport: http(avaxRpc) });
const avaxWallet = createWalletClient({ account, chain: avalanche, transport: http(avaxRpc) });
const bscPublic = createPublicClient({ chain: bsc, transport: http(bscRpc) });

const erc20 = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);

type QuoteTx = {
  to: Address;
  data: Hex;
  value: Hex;
  gasLimit?: Hex;
  approvalAddress: Address;
  fromAmount: string;
  tool: string;
  id: string;
};

async function ensureApprove(spender: Address, amount: bigint) {
  const current = await avaxPublic.readContract({
    address: AVAX_USDC,
    abi: erc20,
    functionName: "allowance",
    args: [wallet, spender],
  });
  if (current >= amount) {
    console.log(JSON.stringify({ approve: "skip", spender, current: current.toString() }));
    return null as Hex | null;
  }
  const hash = await avaxWallet.writeContract({
    address: AVAX_USDC,
    abi: erc20,
    functionName: "approve",
    args: [spender, amount],
  });
  console.log(JSON.stringify({ approve: hash, spender, amount: amount.toString() }));
  await avaxPublic.waitForTransactionReceipt({ hash });
  return hash;
}

async function sendQuote(label: string, q: QuoteTx) {
  const amount = BigInt(q.fromAmount);
  const approveHash = await ensureApprove(getAddress(q.approvalAddress), amount);
  const hash = await avaxWallet.sendTransaction({
    to: getAddress(q.to),
    data: q.data,
    value: BigInt(q.value || "0x0"),
    gas: q.gasLimit ? BigInt(q.gasLimit) : undefined,
  });
  console.log(JSON.stringify({ label, tool: q.tool, quoteId: q.id, hash, approveHash }));
  const receipt = await avaxPublic.waitForTransactionReceipt({ hash });
  console.log(JSON.stringify({ label, status: receipt.status, block: Number(receipt.blockNumber) }));
  return { hash, approveHash, status: receipt.status };
}

async function balances() {
  const [aUsdc, aGas, bUsdc, bGas] = await Promise.all([
    avaxPublic.readContract({ address: AVAX_USDC, abi: erc20, functionName: "balanceOf", args: [wallet] }),
    avaxPublic.getBalance({ address: wallet }),
    bscPublic.readContract({ address: BSC_USDC, abi: erc20, functionName: "balanceOf", args: [wallet] }),
    bscPublic.getBalance({ address: wallet }),
  ]);
  return {
    wallet,
    avalanche: { usdc: formatUnits(aUsdc, 6), avax: formatUnits(aGas, 18) },
    bsc: { usdc: formatUnits(bUsdc, 18), bnb: formatUnits(bGas, 18) },
  };
}

const gasQ = JSON.parse(readFileSync("/tmp/lifi-gas-tx.json", "utf8")) as QuoteTx;
const mainQ = JSON.parse(readFileSync("/tmp/lifi-main-tx.json", "utf8")) as QuoteTx;

console.log(JSON.stringify({ step: "start", ...(await balances()) }, null, 2));

if (account.address.toLowerCase() !== wallet.toLowerCase()) {
  throw new Error(`Key address ${account.address} != expected ${wallet}`);
}

const gas = await sendQuote("bridge_gas_bnb", gasQ);
// give LI.FI a moment; then fire main bridge
await new Promise((r) => setTimeout(r, 3000));
const main = await sendQuote("bridge_usdc_bsc", mainQ);

const out = {
  wallet,
  gasBridge: {
    hash: gas.hash,
    approveHash: gas.approveHash,
    snowscan: `https://snowscan.xyz/tx/${gas.hash}`,
    tool: gasQ.tool,
  },
  usdcBridge: {
    hash: main.hash,
    approveHash: main.approveHash,
    snowscan: `https://snowscan.xyz/tx/${main.hash}`,
    tool: mainQ.tool,
  },
  balancesAfterSource: await balances(),
};

writeFileSync("/tmp/bridge-result.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

// Poll BSC until USDC >= 104 or timeout ~4 min
const deadline = Date.now() + 4 * 60_000;
while (Date.now() < deadline) {
  const b = await balances();
  console.log(JSON.stringify({ poll: b.bsc }));
  if (Number(b.bsc.usdc) >= 104 && Number(b.bsc.bnb) > 0) {
    writeFileSync(
      "/tmp/bridge-result.json",
      JSON.stringify({ ...out, balancesFinal: b, ready: true }, null, 2),
    );
    console.log(JSON.stringify({ ready: true, ...b }, null, 2));
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 15_000));
}
console.error("Timed out waiting for BSC funds");
process.exit(2);
