import { useAuth } from "@clerk/clerk-expo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useIsOnline } from "./useNetworkStatus";
import { createOfflineId, type OfflineScope } from "./offlineQueue";
import {
  createShopCompletionSnapshot,
  getShopCompletionMode,
} from "./shoppingList";
import { useScopedOfflineQueue } from "./useScopedOfflineQueue";
import {
  getItemsCacheKey,
  getItem,
  setItem,
  getItemsCacheTimestampKey,
} from "./storage";

/**
 * Type for item with addedByUser (matches what getByList returns)
 */
interface ItemWithUser {
  _id: Id<"items">;
  _creationTime: number;
  listId: Id<"lists">;
  clientId?: string;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  estimatedPricePence?: number;
  isCompleted: boolean;
  addedBy: Id<"users">;
  completedBy?: Id<"users">;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  addedByUser?: {
    _id: Id<"users">;
    name?: string;
    imageUrl?: string;
  } | null;
}

/**
 * Optimistic item that may be pending sync
 */
export interface OptimisticItem extends ItemWithUser {
  /** Whether this item is pending sync (created/modified offline) */
  isPendingSync?: boolean;
  /** The offline queue mutation ID for tracking */
  pendingMutationId?: string;
}

/**
 * Generate a temporary ID for optimistic items
 */
/**
 * Hook that provides offline-capable item operations with optimistic updates.
 * - When online: executes mutations directly
 * - When offline: queues mutations and updates cache optimistically
 * - Shows sync indicator for pending items
 */
export function useOfflineItems(
  listId: Id<"lists">,
  householdId?: Id<"households">,
  ownsQueue = true,
) {
  const { userId } = useAuth();
  const scope = useMemo<OfflineScope | null>(
    () =>
      ownsQueue && userId && householdId
        ? { clerkUserId: userId, householdId }
        : null,
    [householdId, ownsQueue, userId],
  );
  const isOnline = useIsOnline();
  const {
    addToQueue,
    queue,
    isProcessing,
    hasSyncError,
    processQueue,
  } = useScopedOfflineQueue(scope);

  // Track items that are pending sync (by their temp ID or mutation ID)
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());

  // Convex mutations for online mode
  const addItemMutation = useMutation(api.items.add);
  const toggleCompleteMutation = useMutation(api.items.toggleComplete);
  const removeItemMutation = useMutation(api.items.remove);
  const updateItemMutation = useMutation(api.items.update);
  const createSession = useMutation(api.sessions.create);

  /**
   * Update items in cache
   */
  const updateCachedItems = useCallback(
    (updater: (items: OptimisticItem[]) => OptimisticItem[]) => {
      const cacheKey = getItemsCacheKey(listId);
      const timestampKey = getItemsCacheTimestampKey(listId);
      const currentItems = getItem<OptimisticItem[]>(cacheKey) || [];
      const updatedItems = updater(currentItems);
      setItem(cacheKey, updatedItems);
      setItem(timestampKey, Date.now());
    },
    [listId]
  );

  const getItemReference = useCallback(
    (itemId: Id<"items">) => {
      const cachedItems =
        getItem<OptimisticItem[]>(getItemsCacheKey(listId)) ?? [];
      const item = cachedItems.find((candidate) => candidate._id === itemId);
      if (item?.clientId) {
        return { listId, clientId: item.clientId };
      }
      return { listId, itemId };
    },
    [listId],
  );

  /**
   * Add an item - works both online and offline
   */
  const addItem = useCallback(
    async (name: string, options?: { quantity?: number; unit?: string; notes?: string; category?: string; estimatedPricePence?: number }) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      if (isOnline) {
        // Online: execute mutation directly
        await addItemMutation({
          listId,
          name: trimmedName,
          ...options,
        });
      } else {
        // Offline: queue mutation and update cache optimistically
        const clientId = createOfflineId("item");
        const tempId = `temp_${clientId}`;
        const now = Date.now();

        // Create optimistic item
        const optimisticItem: OptimisticItem = {
          _id: tempId as Id<"items">,
          _creationTime: now,
          listId,
          clientId,
          name: trimmedName,
          quantity: options?.quantity,
          unit: options?.unit,
          notes: options?.notes,
          category: options?.category,
          isCompleted: false,
          addedBy: "temp" as Id<"users">, // Will be set correctly when synced
          createdAt: now,
          updatedAt: now,
          isPendingSync: true,
        };

        // Add to queue
        const mutationId = addToQueue({
          type: "items.add",
          args: {
            listId,
            clientId,
            name: trimmedName,
            ...options,
          },
        });

        optimisticItem.pendingMutationId = mutationId;

        // Update cache with optimistic item
        updateCachedItems((items) => [...items, optimisticItem]);

        // Track pending item
        setPendingItemIds((prev) => new Set([...prev, tempId]));

        console.log("[OfflineItems] Added item offline:", trimmedName);
      }
    },
    [isOnline, listId, addItemMutation, addToQueue, updateCachedItems]
  );

  /**
   * Toggle item completion - works both online and offline
   */
  const toggleComplete = useCallback(
    async (itemId: Id<"items">) => {
      const isLocalOnlyItem = String(itemId).startsWith("temp_");
      if (isOnline && !isLocalOnlyItem) {
        // Online: execute mutation directly
        await toggleCompleteMutation({ itemId });
      } else {
        const cachedItems =
          getItem<OptimisticItem[]>(getItemsCacheKey(listId)) ?? [];
        const currentItem = cachedItems.find((item) => item._id === itemId);
        if (!currentItem) throw new Error("Item not found in offline cache");
        const isCompleted = !currentItem.isCompleted;
        const mutationId = addToQueue({
          type: "items.setCompleted",
          args: { ...getItemReference(itemId), isCompleted },
        });

        // Update cache optimistically
        updateCachedItems((items) =>
          items.map((item) => {
            if (item._id === itemId) {
              return {
                ...item,
                isCompleted,
                completedAt: isCompleted ? Date.now() : undefined,
                updatedAt: Date.now(),
                isPendingSync: true,
                pendingMutationId: mutationId,
              };
            }
            return item;
          })
        );

        // Track pending item
        setPendingItemIds((prev) => new Set([...prev, itemId]));

        console.log("[OfflineItems] Toggled item offline:", itemId);
      }
    },
    [
      addToQueue,
      getItemReference,
      isOnline,
      listId,
      toggleCompleteMutation,
      updateCachedItems,
    ],
  );

  /**
   * Remove an item - works both online and offline
   */
  const removeItem = useCallback(
    async (itemId: Id<"items">) => {
      const isLocalOnlyItem = String(itemId).startsWith("temp_");
      if (isOnline && !isLocalOnlyItem) {
        // Online: execute mutation directly
        await removeItemMutation({ itemId });
      } else {
        // Offline: queue mutation and update cache optimistically
        addToQueue({
          type: "items.remove",
          args: getItemReference(itemId),
        });

        // Update cache optimistically - remove the item
        updateCachedItems((items) => items.filter((item) => item._id !== itemId));

        console.log("[OfflineItems] Removed item offline:", itemId);
      }
    },
    [
      addToQueue,
      getItemReference,
      isOnline,
      removeItemMutation,
      updateCachedItems,
    ],
  );

  /**
   * Update an item - works both online and offline
   */
  const updateItem = useCallback(
    async (
      itemId: Id<"items">,
      updates: { name?: string; quantity?: number; unit?: string; notes?: string; category?: string; estimatedPricePence?: number | null }
    ) => {
      const isLocalOnlyItem = String(itemId).startsWith("temp_");
      if (isOnline && !isLocalOnlyItem) {
        // Online: execute mutation directly
        await updateItemMutation({ itemId, ...updates });
      } else {
        // Offline: queue mutation and update cache optimistically
        const mutationId = addToQueue({
          type: "items.update",
          args: { ...getItemReference(itemId), ...updates },
        });

        // Update cache optimistically
        updateCachedItems((items) =>
          items.map((item) => {
            if (item._id === itemId) {
              const optimisticUpdates = {
                ...updates,
                estimatedPricePence:
                  updates.estimatedPricePence === null
                    ? undefined
                    : updates.estimatedPricePence,
              };
              return {
                ...item,
                ...optimisticUpdates,
                updatedAt: Date.now(),
                isPendingSync: true,
                pendingMutationId: mutationId,
              };
            }
            return item;
          })
        );

        // Track pending item
        setPendingItemIds((prev) => new Set([...prev, itemId]));

        console.log("[OfflineItems] Updated item offline:", itemId);
      }
    },
    [
      addToQueue,
      getItemReference,
      isOnline,
      updateItemMutation,
      updateCachedItems,
    ],
  );

  /**
   * Check if an item is pending sync
   */
  const isPendingSync = useCallback(
    (itemId: Id<"items">): boolean => {
      // Check if item ID is in pending set
      if (pendingItemIds.has(itemId)) return true;

      // Check if there's a queued mutation for this item
      const reference = getItemReference(itemId);
      return queue.some((mutation) => {
        if (reference.itemId) {
          return (
            "itemId" in mutation.args &&
            mutation.args.itemId === reference.itemId
          );
        }
        return (
          "clientId" in mutation.args &&
          "listId" in mutation.args &&
          mutation.args.listId === reference.listId &&
          mutation.args.clientId === reference.clientId
        );
      });
    },
    [getItemReference, pendingItemIds, queue],
  );

  const completeShop = useCallback(
    async (items: OptimisticItem[]) => {
      if (!householdId) {
        throw new Error("Shop completion is unavailable until your household is loaded");
      }
      const sessionDate = Date.now();
      const mode = getShopCompletionMode({
        isOnline,
        queueLength: queue.length,
      });
      if (mode === "immediate") {
        await createSession({ householdId, listId, sessionDate });
        return { mode, sessionDate } as const;
      }

      const operationId = createOfflineId("shop_completion");
      addToQueue({
        type: "sessions.complete",
        args: {
          householdId,
          listId,
          operationId,
          sessionDate,
          items: createShopCompletionSnapshot(items),
        },
      });
      return { mode, operationId, sessionDate } as const;
    },
    [addToQueue, createSession, householdId, isOnline, listId, queue.length],
  );

  const hasQueuedCompletion = queue.some(
    (operation) =>
      operation.type === "sessions.complete" &&
      operation.args.listId === listId,
  );

  /**
   * Clear pending status for items that have been synced
   */
  useEffect(() => {
    // When queue becomes empty and we were processing, clear all pending items
    if (queue.length === 0 && !isProcessing && pendingItemIds.size > 0) {
      setPendingItemIds(new Set());

      // Also clear the isPendingSync flag from cached items
      updateCachedItems((items) =>
        items
          // Remove optimistic items with temp IDs (they'll be replaced by real items)
          .filter((item) => !String(item._id).startsWith("temp_"))
          .map((item) => ({
            ...item,
            isPendingSync: false,
            pendingMutationId: undefined,
          }))
      );
    }
  }, [queue.length, isProcessing, pendingItemIds.size, updateCachedItems]);

  return {
    // Operations
    addItem,
    toggleComplete,
    removeItem,
    updateItem,
    completeShop,

    // Status
    isOnline,
    isPendingSync,
    pendingCount: pendingItemIds.size,
    isProcessing,
    hasSyncError,
    hasQueuedCompletion,
    retrySync: processQueue,

    // Queue info
    queueLength: queue.length,
  };
}
