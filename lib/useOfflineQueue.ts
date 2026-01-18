import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { StorageKeys, getItem, setItem, removeItem } from "./storage";
import { useNetworkStatus } from "./useNetworkStatus";

/**
 * Supported mutation types for offline queueing.
 * Each mutation type corresponds to a Convex mutation.
 */
export type MutationType =
  | "items.add"
  | "items.toggleComplete"
  | "items.update"
  | "items.remove"
  | "lists.create"
  | "lists.archive"
  | "lists.update";

/**
 * Arguments for each mutation type.
 */
export type MutationArgs = {
  "items.add": {
    listId: Id<"lists">;
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    category?: string;
  };
  "items.toggleComplete": {
    itemId: Id<"items">;
  };
  "items.update": {
    itemId: Id<"items">;
    name?: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    category?: string;
  };
  "items.remove": {
    itemId: Id<"items">;
  };
  "lists.create": {
    householdId: Id<"households">;
    name: string;
    category?: string;
  };
  "lists.archive": {
    listId: Id<"lists">;
  };
  "lists.update": {
    listId: Id<"lists">;
    name?: string;
    category?: string;
  };
};

/**
 * A queued mutation entry.
 */
export interface QueuedMutation<T extends MutationType = MutationType> {
  /** Unique identifier for this queued mutation */
  id: string;
  /** The mutation function name */
  fn: T;
  /** The mutation arguments */
  args: MutationArgs[T];
  /** Timestamp when the mutation was queued */
  timestamp: number;
  /** Number of retry attempts */
  retryCount?: number;
}

/**
 * Queue state exposed by the hook.
 */
export interface OfflineQueueState {
  /** Current queued mutations */
  queue: QueuedMutation[];
  /** Whether the queue is currently being processed */
  isProcessing: boolean;
  /** Number of items in the queue */
  queueLength: number;
}

/**
 * Generate a unique ID for queued mutations.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get the current queue from storage.
 */
function getStoredQueue(): QueuedMutation[] {
  const queue = getItem<QueuedMutation[]>(StorageKeys.OFFLINE_QUEUE);
  return queue ?? [];
}

/**
 * Save the queue to storage.
 */
function saveQueue(queue: QueuedMutation[]): void {
  if (queue.length === 0) {
    removeItem(StorageKeys.OFFLINE_QUEUE);
  } else {
    setItem(StorageKeys.OFFLINE_QUEUE, queue);
  }
}

/**
 * Hook for managing an offline mutation queue.
 * Stores mutations in MMKV when offline and processes them when online.
 *
 * @returns Queue state and functions to manage the queue
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>(() => getStoredQueue());
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, justCameOnline } = useNetworkStatus();
  const processingRef = useRef(false);

  // Get all mutation references
  const addItem = useMutation(api.items.add);
  const toggleComplete = useMutation(api.items.toggleComplete);
  const updateItem = useMutation(api.items.update);
  const removeItemMutation = useMutation(api.items.remove);
  const createList = useMutation(api.lists.create);
  const archiveList = useMutation(api.lists.archive);
  const updateList = useMutation(api.lists.update);

  /**
   * Add a mutation to the offline queue.
   */
  const addToQueue = useCallback(
    <T extends MutationType>(fn: T, args: MutationArgs[T]): string => {
      const mutation: QueuedMutation<T> = {
        id: generateId(),
        fn,
        args,
        timestamp: Date.now(),
        retryCount: 0,
      };

      setQueue((prevQueue) => {
        const newQueue = [...prevQueue, mutation];
        // Sort by timestamp to ensure order
        newQueue.sort((a, b) => a.timestamp - b.timestamp);
        saveQueue(newQueue);
        return newQueue;
      });

      console.log(`[OfflineQueue] Added mutation to queue: ${fn}`, args);
      return mutation.id;
    },
    []
  );

  /**
   * Remove a mutation from the queue by ID.
   */
  const removeFromQueue = useCallback((id: string): void => {
    setQueue((prevQueue) => {
      const newQueue = prevQueue.filter((m) => m.id !== id);
      saveQueue(newQueue);
      return newQueue;
    });
  }, []);

  /**
   * Execute a single mutation based on its type.
   */
  const executeMutation = useCallback(
    async (mutation: QueuedMutation): Promise<void> => {
      const { fn, args } = mutation;

      switch (fn) {
        case "items.add":
          await addItem(args as MutationArgs["items.add"]);
          break;
        case "items.toggleComplete":
          await toggleComplete(args as MutationArgs["items.toggleComplete"]);
          break;
        case "items.update":
          await updateItem(args as MutationArgs["items.update"]);
          break;
        case "items.remove":
          await removeItemMutation(args as MutationArgs["items.remove"]);
          break;
        case "lists.create":
          await createList(args as MutationArgs["lists.create"]);
          break;
        case "lists.archive":
          await archiveList(args as MutationArgs["lists.archive"]);
          break;
        case "lists.update":
          await updateList(args as MutationArgs["lists.update"]);
          break;
        default:
          console.warn(`[OfflineQueue] Unknown mutation type: ${fn}`);
      }
    },
    [
      addItem,
      toggleComplete,
      updateItem,
      removeItemMutation,
      createList,
      archiveList,
      updateList,
    ]
  );

  /**
   * Process all queued mutations in order.
   * Uses last-write-wins for conflict resolution (timestamp-based ordering).
   */
  const processQueue = useCallback(async (): Promise<{
    success: number;
    failed: number;
  }> => {
    // Prevent concurrent processing
    if (processingRef.current) {
      console.log("[OfflineQueue] Already processing queue, skipping");
      return { success: 0, failed: 0 };
    }

    const currentQueue = getStoredQueue();
    if (currentQueue.length === 0) {
      console.log("[OfflineQueue] Queue is empty, nothing to process");
      return { success: 0, failed: 0 };
    }

    processingRef.current = true;
    setIsProcessing(true);

    let successCount = 0;
    let failedCount = 0;
    const failedMutations: QueuedMutation[] = [];

    console.log(
      `[OfflineQueue] Processing ${currentQueue.length} queued mutations...`
    );

    // Process mutations in order (sorted by timestamp)
    const sortedQueue = [...currentQueue].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    for (const mutation of sortedQueue) {
      try {
        await executeMutation(mutation);
        successCount++;
        console.log(
          `[OfflineQueue] Successfully processed mutation: ${mutation.fn}`
        );
      } catch (error) {
        const retryCount = (mutation.retryCount ?? 0) + 1;
        console.error(
          `[OfflineQueue] Failed to process mutation: ${mutation.fn}`,
          error
        );

        // Retry up to 3 times
        if (retryCount < 3) {
          failedMutations.push({ ...mutation, retryCount });
        } else {
          console.error(
            `[OfflineQueue] Mutation exceeded max retries, dropping: ${mutation.fn}`
          );
          failedCount++;
        }
      }
    }

    // Update queue with only failed mutations that can be retried
    setQueue(failedMutations);
    saveQueue(failedMutations);

    processingRef.current = false;
    setIsProcessing(false);

    console.log(
      `[OfflineQueue] Processing complete. Success: ${successCount}, Failed: ${failedCount}, Remaining: ${failedMutations.length}`
    );

    return { success: successCount, failed: failedCount };
  }, [executeMutation]);

  /**
   * Clear all queued mutations.
   */
  const clearQueue = useCallback((): void => {
    setQueue([]);
    saveQueue([]);
    console.log("[OfflineQueue] Queue cleared");
  }, []);

  /**
   * Get the current queue length.
   */
  const getQueueLength = useCallback((): number => {
    return getStoredQueue().length;
  }, []);

  // Auto-process queue when coming back online
  useEffect(() => {
    if (justCameOnline && queue.length > 0 && !processingRef.current) {
      console.log(
        "[OfflineQueue] Network restored, processing queued mutations..."
      );
      processQueue();
    }
  }, [justCameOnline, queue.length, processQueue]);

  // Sync state with storage on mount
  useEffect(() => {
    const storedQueue = getStoredQueue();
    if (storedQueue.length !== queue.length) {
      setQueue(storedQueue);
    }
  }, []);

  return {
    // State
    queue,
    isProcessing,
    queueLength: queue.length,
    isOnline: isConnected,

    // Actions
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    getQueueLength,
  };
}

/**
 * Hook to check if there are pending offline mutations.
 */
export function useHasPendingMutations(): boolean {
  const [hasPending, setHasPending] = useState(() => {
    const queue = getStoredQueue();
    return queue.length > 0;
  });

  useEffect(() => {
    const queue = getStoredQueue();
    setHasPending(queue.length > 0);
  }, []);

  return hasPending;
}
