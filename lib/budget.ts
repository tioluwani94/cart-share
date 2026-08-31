export interface PlannedItem {
  estimatedPricePence?: number;
  quantity?: number;
}

export function calculatePlannedTotal(items: PlannedItem[]): number {
  return items.reduce((total, item) => {
    if (item.estimatedPricePence === undefined) return total;
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    return total + Math.round(item.estimatedPricePence * quantity);
  }, 0);
}

export function calculateMonthlyRemaining(
  monthlyBudgetPence: number,
  actualSpendPence: number,
): number {
  return Math.round(monthlyBudgetPence) - Math.round(actualSpendPence);
}

export function calculatePlanVariance(
  plannedPence: number,
  actualPence: number,
): { differencePence: number; status: "under" | "on_plan" | "over" } {
  const differencePence = Math.abs(
    Math.round(plannedPence) - Math.round(actualPence),
  );
  const status =
    actualPence < plannedPence
      ? "under"
      : actualPence > plannedPence
        ? "over"
        : "on_plan";
  return { differencePence, status };
}
