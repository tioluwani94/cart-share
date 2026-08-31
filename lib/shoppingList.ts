import { calculatePlannedTotal } from "./budget";

export interface ShoppingListSummaryItem {
  isCompleted: boolean;
  estimatedPricePence?: number;
  quantity?: number;
}

interface FinishShoppingListState {
  totalItems: number;
  isOnline: boolean;
  queueLength: number;
  isFinishing: boolean;
}

export function canFinishShoppingList({
  totalItems,
  isOnline,
  queueLength,
  isFinishing,
}: FinishShoppingListState): boolean {
  return totalItems > 0 && isOnline && queueLength === 0 && !isFinishing;
}

export function summarizeShoppingList<T extends ShoppingListSummaryItem>(
  items: T[],
) {
  const uncompletedItems = items.filter((item) => !item.isCompleted);
  const completedItems = items.filter((item) => item.isCompleted);
  const totalItems = items.length;
  const completedCount = completedItems.length;

  return {
    uncompletedItems,
    completedItems,
    totalItems,
    completedCount,
    progress: totalItems === 0 ? 0 : completedCount / totalItems,
    plannedTotalPence: calculatePlannedTotal(items),
  };
}
