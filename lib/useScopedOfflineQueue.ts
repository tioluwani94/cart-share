import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendOfflineOperation,
  createOfflineOperation,
  getOfflineQueueStorageKey,
  getReplayOperations,
  replayOfflineOperations,
  scopesMatch,
  type NewOfflineOperation,
  type OfflineOperation,
  type OfflineScope,
} from "./offlineQueue";
import { useNetworkStatus } from "./useNetworkStatus";
import { useSyncStatusSafe } from "./SyncStatusContext";
import { StorageKeys, getItem, removeItem, setItem } from "./storage";

function getStoredQueue(scope: OfflineScope | null): OfflineOperation[] {
  if (!scope) return [];
  return (
    getItem<OfflineOperation[]>(getOfflineQueueStorageKey(scope)) ?? []
  );
}

function saveQueue(scope: OfflineScope, queue: OfflineOperation[]): void {
  const key = getOfflineQueueStorageKey(scope);
  if (queue.length === 0) removeItem(key);
  else setItem(key, queue);
}

/**
 * Account-and-household scoped offline item queue.
 *
 * Conflict semantics are server-arrival based: this queue sends operations
 * FIFO, completion uses an absolute state, and the last Convex mutation
 * applied wins for overlapping fields. Client clocks are not used.
 */
export function useScopedOfflineQueue(scope: OfflineScope | null) {
  const [queue, setQueue] = useState<OfflineOperation[]>(() =>
    getStoredQueue(scope),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected } = useNetworkStatus();
  const processingRef = useRef(false);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const syncStatus = useSyncStatusSafe();

  const addItem = useMutation(api.items.add);
  const setCompleted = useMutation(api.items.setCompleted);
  const updateItem = useMutation(api.items.update);
  const removeItemMutation = useMutation(api.items.remove);
  const decideRestock = useMutation(api.restocks.decide);
  const recalculateReminders = useMutation(
    api.notifications.recalculateForHousehold,
  );

  const addToQueue = useCallback(
    (input: NewOfflineOperation): string => {
      if (!scope) {
        throw new Error(
          "Offline sync is unavailable until your household is loaded",
        );
      }

      const operation = createOfflineOperation(scope, input);
      setQueue((current) => {
        const next = appendOfflineOperation(current, operation);
        saveQueue(scope, next);
        return next;
      });
      return operation.id;
    },
    [scope],
  );

  const executeOperation = useCallback(
    async (operation: OfflineOperation): Promise<void> => {
      switch (operation.type) {
        case "items.add":
          await addItem(operation.args);
          return;
        case "items.setCompleted":
          await setCompleted(operation.args);
          return;
        case "items.update":
          await updateItem(operation.args);
          return;
        case "items.remove":
          await removeItemMutation(operation.args);
          return;
        case "restocks.decide":
          await decideRestock(operation.args);
          await recalculateReminders({});
      }
    },
    [
      addItem,
      decideRestock,
      recalculateReminders,
      removeItemMutation,
      setCompleted,
      updateItem,
    ],
  );

  const processQueue = useCallback(async (): Promise<{
    success: number;
    failed: number;
  }> => {
    const processingScope = scopeRef.current;
    if (!processingScope || processingRef.current) {
      return { success: 0, failed: 0 };
    }

    const replay = getReplayOperations(
      getStoredQueue(processingScope),
      processingScope,
    );
    if (replay.length === 0) return { success: 0, failed: 0 };

    processingRef.current = true;
    setIsProcessing(true);
    syncStatus?.startSyncing(replay.length);

    // Stop at the first failure so later writes never overtake an earlier
    // dependency. The failed write and its tail remain queued for retry.
    const replayResult = await replayOfflineOperations(
      replay,
      executeOperation,
      () => {
        const activeScope = scopeRef.current;
        return Boolean(
          activeScope && scopesMatch(activeScope, processingScope),
        );
      },
    );
    const { success, failed, remaining } = replayResult;

    const replayIds = new Set(replay.map((operation) => operation.id));
    const operationsQueuedDuringReplay = getStoredQueue(
      processingScope,
    ).filter((operation) => !replayIds.has(operation.id));
    const nextQueue = [...remaining, ...operationsQueuedDuringReplay].sort(
      (a, b) => a.queuedAt - b.queuedAt,
    );
    saveQueue(processingScope, nextQueue);
    if (
      scopeRef.current &&
      scopesMatch(scopeRef.current, processingScope)
    ) {
      setQueue(nextQueue);
    }

    processingRef.current = false;
    setIsProcessing(false);
    syncStatus?.finishSyncing({ success, failed });
    return { success, failed };
  }, [executeOperation, syncStatus]);

  const clearQueue = useCallback(() => {
    if (!scope) return;
    saveQueue(scope, []);
    setQueue([]);
  }, [scope]);

  useEffect(() => {
    // Never replay the legacy globally-scoped queue.
    removeItem(StorageKeys.OFFLINE_QUEUE);
    setQueue(getStoredQueue(scope));
  }, [scope]);

  useEffect(() => {
    if (isConnected && queue.length > 0 && !processingRef.current) {
      void processQueue();
    }
  }, [isConnected, processQueue, queue.length]);

  return {
    queue,
    isProcessing,
    queueLength: queue.length,
    isOnline: isConnected,
    addToQueue,
    processQueue,
    clearQueue,
  };
}
