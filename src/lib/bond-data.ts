export const vaults = [
  {
    id: "avalanche-treasury",
    name: "Avalanche Treasury Vault",
    network: "Avalanche",
    asset: "USDC",
    minimum: "$100",
    address: "0xaD01573b459805E3954398796203d830B57A8bD9",
    status: "Open",
    description: "An asynchronous ERC-7540 route to a licensed bond strategy. Final shares are issued only after vault processing.",
  },
  {
    id: "bnb-treasury",
    name: "BNB Treasury Vault",
    network: "BNB Chain",
    asset: "USDC",
    minimum: "$100",
    address: "0xc975a3EeF2e49F8eDdEf585340C43f15300fCB82",
    status: "Open",
    description: "The BNB Chain route to the same asynchronous settlement discipline and independently verifiable share state.",
  },
] as const;

export const subscriptions = [
  { id: "sub-1042", vault: "Avalanche Treasury Vault", amount: "$100.00", status: "Pending", date: "Sep 27, 2026", shares: "—" },
  { id: "sub-1031", vault: "Avalanche Treasury Vault", amount: "$250.00", status: "Finalized", date: "Sep 24, 2026", shares: "247.83" },
  { id: "sub-1019", vault: "BNB Treasury Vault", amount: "$100.00", status: "Rejected", date: "Sep 18, 2026", shares: "—" },
] as const;

export const activity = [
  { event: "Deposit submitted", detail: "$100 USDC · Avalanche", time: "2 min ago", tone: "pending" },
  { event: "Mandate approved", detail: "RWA allocation · $500 limit", time: "6 min ago", tone: "good" },
  { event: "Shares finalized", detail: "247.83 vault shares", time: "Sep 24", tone: "good" },
  { event: "Subscription rejected", detail: "Network policy mismatch", time: "Sep 18", tone: "bad" },
] as const;