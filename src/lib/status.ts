export type SubscriptionStatus =
  | "Pending"
  | "Claimable"
  | "Finalized"
  | "RedeemPending"
  | "RedeemClaimable"
  | "Withdrawn"
  | "Rejected";

export function isOwnedStatus(status: SubscriptionStatus): boolean {
  return status === "Finalized" || status === "RedeemPending" || status === "RedeemClaimable";
}

export function displayShares(
  status: SubscriptionStatus,
  shares: string | null | undefined,
): string {
  if (
    (status === "Finalized" ||
      status === "RedeemPending" ||
      status === "RedeemClaimable") &&
    shares &&
    shares !== "0"
  ) {
    return shares;
  }
  if (status === "RedeemPending") return "queued";
  return "—";
}

export function ownedValueCents(status: SubscriptionStatus, amountCents: number): number {
  return isOwnedStatus(status) ? amountCents : 0;
}

export function assertNotEarningLabel(status: SubscriptionStatus): string {
  if (status === "Pending" || status === "Claimable") {
    return "Pending — not owned, not earning";
  }
  if (status === "Finalized") return "Finalized — shares proven";
  if (status === "RedeemPending") return "Redeem queued — waiting on IXS cycle";
  if (status === "RedeemClaimable") return "Redeem claimable — claim USDC then withdraw";
  if (status === "Withdrawn") return "Withdrawn — USDC sent out";
  return "Rejected";
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** USDC base units — Avalanche USDC is 6 decimals; BSC peg USDC is 18.
 * Uses integer cents to avoid float precision loss past Number.MAX_SAFE_INTEGER
 * at 18 decimals (e.g. $999.99).
 */
export function usdcToBaseUnits(dollars: number, decimals = 6): bigint {
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new Error("USDC amount must be a non-negative finite number.");
  }
  if (decimals < 2) throw new Error("USDC decimals must be ≥ 2.");
  const cents = Math.round(dollars * 100);
  return BigInt(cents) * 10n ** BigInt(decimals - 2);
}
