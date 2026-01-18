import { useCallback, useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useIsOnline } from "./useNetworkStatus";
import { useOfflineQueue } from "./useOfflineQueue";
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
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
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
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Hook that provides offline-capable item operations with optimistic updates.
 * - When online: executes mutations directly
 * - When offline: queues mutations and updates cache optimistically
 * - Shows sync indicator for pending items
 */
export function useOfflineItems(listId: Id<"lists">) {
  const isOnline = useIsOnline();
  const { addToQueue, queue, isProcessing } = useOfflineQueue();

  // Track items that are pending sync (by their temp ID or mutation ID)
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());

  // Convex mutations for online mode
  const addItemMutation = useMutation(api.items.add);
  const toggleCompleteMutation = useMutation(api.items.toggleComplete);
  const removeItemMutation = useMutation(api.items.remove);
  const updateItemMutation = useMutation(api.items.update);

  // Track if we're in the process of syncing
  const syncingRef = useRef(false);

  /**
   * Get items from cache
   */
  const getCachedItemsData = useCallback((): OptimisticItem[] | null => {
    const cacheKey = getItemsCacheKey(listId);
    return getItem<OptimisticItem[]>(cacheKey);
  }, [listId]);

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

  /**
   * Add an item - works both online and offline
   */
  const addItem = useCallback(
    async (name: string, options?: { quantity?: number; unit?: string; notes?: string; category?: string }) => {
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
        const tempId = generateTempId();
        const now = Date.now();

        // Create optimistic item
        const optimisticItem: OptimisticItem = {
          _id: tempId as Id<"items">,
          _creationTime: now,
          listId,
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
        const mutationId = addToQueue("items.add", {
          listId,
          name: trimmedName,
          ...options,
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
      if (isOnline) {
        // Online: execute mutation directly
        await toggleCompleteMutation({ itemId });
      } else {
        // Offline: queue mutation and update cache optimistically
        const mutationId = addToQueue("items.toggleComplete", { itemId });

        // Update cache optimistically
        updateCachedItems((items) =>
          items.map((item) => {
            if (item._id === itemId) {
              return {
                ...item,
                isCompleted: !item.isCompleted,
                completedAt: !item.isCompleted ? Date.now() : undefined,
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
    [isOnline, toggleCompleteMutation, addToQueue, updateCachedItems]
  );

  /**
   * Remove an item - works both online and offline
   */
  const removeItem = useCallback(
    async (itemId: Id<"items">) => {
      if (isOnline) {
        // Online: execute mutation directly
        await removeItemMutation({ itemId });
      } else {
        // Offline: queue mutation and update cache optimistically
        addToQueue("items.remove", { itemId });

        // Update cache optimistically - remove the item
        updateCachedItems((items) => items.filter((item) => item._id !== itemId));

        console.log("[OfflineItems] Removed item offline:", itemId);
      }
    },
    [isOnline, removeItemMutation, addToQueue, updateCachedItems]
  );

  /**
   * Update an item - works both online and offline
   */
  const updateItem = useCallback(
    async (
      itemId: Id<"items">,
      updates: { name?: string; quantity?: number; unit?: string; notes?: string; category?: string }
    ) => {
      if (isOnline) {
        // Online: execute mutation directly
        await updateItemMutation({ itemId, ...updates });
      } else {
        // Offline: queue mutation and update cache optimistically
        const mutationId = addToQueue("items.update", { itemId, ...updates });

        // Update cache optimistically
        updateCachedItems((items) =>
          items.map((item) => {
            if (item._id === itemId) {
              return {
                ...item,
                ...updates,
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
    [isOnline, updateItemMutation, addToQueue, updateCachedItems]
  );

  /**
   * Check if an item is pending sync
   */
  const isPendingSync = useCallback(
    (itemId: Id<"items">): boolean => {
      // Check if item ID is in pending set
      if (pendingItemIds.has(itemId)) return true;

      // Check if there's a queued mutation for this item
      return queue.some((mutation) => {
        const args = mutation.args as Record<string, unknown>;
        return args.itemId === itemId;
      });
    },
    [pendingItemIds, queue]
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

    // Status
    isOnline,
    isPendingSync,
    pendingCount: pendingItemIds.size,
    isProcessing,

    // Queue info
    queueLength: queue.length,
  };
}
