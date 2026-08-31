import type { Id } from "@/convex/_generated/dataModel";
import { useMemo } from "react";
import { summarizeShoppingList } from "./shoppingList";
import { useCachedItems } from "./useCachedQuery";
import { useOfflineItems } from "./useOfflineItems";

/**
 * Shared shopping-list interface for planning and in-store screens.
 * Cached data, optimistic offline actions, and derived totals stay consistent
 * regardless of which route presents the list.
 */
export function useShoppingList(
  listId: Id<"lists">,
  householdId?: Id<"households">,
  ownsQueue = true,
) {
  const { data: items, isFromCache, isLoading } = useCachedItems(listId);
  const actions = useOfflineItems(listId, householdId, ownsQueue);
  const summary = useMemo(
    () => summarizeShoppingList(items ?? []),
    [items],
  );

  return {
    items,
    isFromCache,
    isLoading,
    ...summary,
    ...actions,
  };
}
