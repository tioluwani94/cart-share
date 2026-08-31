import type { Id } from "@/convex/_generated/dataModel";
import { calculatePlannedTotal } from "./budget";
import type { ShopCompletionItemSnapshot } from "./offlineQueue";

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

interface ShoppingListCompletionItem {
  _id: Id<"items">;
  clientId?: string;
  isCompleted: boolean;
}

export type ShoppingMode = "in_store" | "online";
export type PreferredShoppingMode = ShoppingMode | "both";

export function shouldRejectNextShopClaim({
  currentActiveList,
  onlyIfNoActiveList,
}: {
  currentActiveList: { isArchived: boolean } | null;
  onlyIfNoActiveList: boolean;
}): boolean {
  return Boolean(
    onlyIfNoActiveList && currentActiveList && !currentActiveList.isArchived,
  );
}

export function shouldWaitForPlanLists({
  areListsLoading,
  isOnline,
}: {
  areListsLoading: boolean;
  isOnline: boolean;
}): boolean {
  return isOnline && areListsLoading;
}

interface FinishShoppingListState {
  totalItems: number;
  isFinishing: boolean;
  hasQueuedCompletion: boolean;
}

export function canFinishShoppingList({
  totalItems,
  isFinishing,
  hasQueuedCompletion,
}: FinishShoppingListState): boolean {
  return totalItems > 0 && !isFinishing && !hasQueuedCompletion;
}

export function createShopCompletionSnapshot(
  items: ShoppingListCompletionItem[],
): ShopCompletionItemSnapshot[] {
  return items.map((item) =>
    String(item._id).startsWith("temp_") && item.clientId
      ? { clientId: item.clientId, isCompleted: item.isCompleted }
      : { itemId: item._id, isCompleted: item.isCompleted },
  );
}

export function getShopCompletionMode({
  isOnline,
  queueLength,
}: {
  isOnline: boolean;
  queueLength: number;
}): "immediate" | "queued" {
  return isOnline && queueLength === 0 ? "immediate" : "queued";
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
