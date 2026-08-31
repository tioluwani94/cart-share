import { calculatePlannedTotal } from "./budget";

export interface ShoppingListSummaryItem {
  isCompleted: boolean;
  estimatedPricePence?: number;
  quantity?: number;
}

export interface ShoppingListHandoffItem {
  name: string;
  quantity?: number;
  unit?: string;
  isCompleted: boolean;
}

interface ShoppingListHandoffInput {
  listName: string;
  items: ShoppingListHandoffItem[];
}

export type ShoppingMode = "in_store" | "online";
export type PreferredShoppingMode = ShoppingMode | "both";

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

export function buildShoppingListHandoff({
  listName,
  items,
}: ShoppingListHandoffInput): string | null {
  const remainingItems = items.filter((item) => !item.isCompleted);
  if (remainingItems.length === 0) return null;

  const lines = remainingItems.map((item) => {
    const amount = item.quantity
      ? ` — ${item.quantity}${item.unit ? ` ${item.unit.trim()}` : ""}`
      : "";
    return `• ${item.name.trim()}${amount}`;
  });
  const itemLabel = remainingItems.length === 1 ? "item" : "items";

  return `${listName.trim()}\n\n${lines.join("\n")}\n\n${remainingItems.length} ${itemLabel} to order`;
}

export function getEffectiveShoppingMode(
  listMode: ShoppingMode | undefined,
  preferredMode: PreferredShoppingMode | undefined,
): ShoppingMode {
  if (listMode) return listMode;
  return preferredMode === "online" ? "online" : "in_store";
}
