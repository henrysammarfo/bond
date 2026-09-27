export type SubscriptionStatus = "Pending" | "Claimable" | "Finalized" | "Rejected";

export function isOwnedStatus(status: SubscriptionStatus): boolean {
  return status === "Finalized";
}

export function displayShares(
  status: SubscriptionStatus,
  shares: string | null | undefined,
): string {
  if (status === "Finalized" && shares && shares !== "0") return shares;
  return "—";
}

export function ownedValueCents(status: SubscriptionStatus, amountCents: number): number {
  return status === "Finalized" ? amountCents : 0;
}

export function assertNotEarningLabel(status: SubscriptionStatus): string {
  if (status === "Pending" || status === "Claimable") {
    return "Pending — not owned, not earning";
  }
  if (status === "Finalized") return "Finalized — shares proven";
  return "Rejected";
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** USDC on Avalanche uses 6 decimals. */
export function usdcToBaseUnits(dollars: number): bigint {
  return BigInt(Math.round(dollars * 1_000_000));
}
