import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  appendOfflineOperation,
  createOfflineOperation,
  executeOfflineOperation,
  getOfflineConflictStorageKey,
  getOfflineQueueStorageKey,
  getReplayOperations,
  OfflineTerminalConflictError,
  replayOfflineOperations,
  scopesMatch,
  type NewOfflineOperation,
  type OfflineConflict,
  type OfflineOperation,
  type OfflineScope,
} from "./offlineQueue";
import { useNetworkStatus } from "./useNetworkStatus";
import { useSyncStatusSafe } from "./SyncStatusContext";
import { StorageKeys, getItem, removeItem, setItem } from "./storage";

function getStoredQueue(scope: OfflineScope | null): OfflineOperation[] {
  if (!scope) return [];
  return getItem<OfflineOperation[]>(getOfflineQueueStorageKey(scope)) ?? [];
}

function saveQueue(scope: OfflineScope, queue: OfflineOperation[]): void {
  const key = getOfflineQueueStorageKey(scope);
  if (queue.length === 0) removeItem(key);
  else setItem(key, queue);
}

function getStoredConflicts(scope: OfflineScope | null): OfflineConflict[] {
  if (!scope) return [];
  return getItem<OfflineConflict[]>(getOfflineConflictStorageKey(scope)) ?? [];
}

function saveConflicts(
  scope: OfflineScope,
  conflicts: OfflineConflict[],
): void {
  const key = getOfflineConflictStorageKey(scope);
  if (conflicts.length === 0) removeItem(key);
  else setItem(key, conflicts);
}

function hasActiveListConflict(
  result: unknown,
): result is { conflict: "active_list_changed" } {
  return (
    typeof result === "object" &&
    result !== null &&
    "conflict" in result &&
    result.conflict === "active_list_changed"
  );
}

/**
 * App-wide grocery operation queue, isolated per account and household.
 *
 * Conflict semantics are server-arrival based: this queue sends operations
 * FIFO, completion uses an absolute state, and the last Convex mutation
 * applied wins for overlapping fields. Client clocks are not used.
 */
function useOfflineQueueController(scope: OfflineScope | null) {
  const [queue, setQueue] = useState<OfflineOperation[]>(() =>
    getStoredQueue(scope),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasSyncError, setHasSyncError] = useState(false);
  const [conflicts, setConflicts] = useState<OfflineConflict[]>(() =>
    getStoredConflicts(scope),
  );
  const { isConnected } = useNetworkStatus();
  const processingRef = useRef(false);
  const inFlightOperationIdsRef = useRef<ReadonlySet<string>>(new Set());
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const syncStatus = useSyncStatusSafe();

  const addItem = useMutation(api.items.add);
  const setCompleted = useMutation(api.items.setCompleted);
  const updateItem = useMutation(api.items.update);
  const removeItemMutation = useMutation(api.items.remove);
  const decideRestock = useMutation(api.restocks.decide);
  const completeOfflineSession = useMutation(api.sessions.completeOffline);
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
      const next = appendOfflineOperation(
        getStoredQueue(scope),
        operation,
        inFlightOperationIdsRef.current,
      );
      saveQueue(scope, next);
      setQueue(next);
      return operation.id;
    },
    [scope],
  );

  const executeOperation = useCallback(
    (operation: OfflineOperation): Promise<void> =>
      executeOfflineOperation(operation, {
        addItem,
        setCompleted,
        updateItem,
        removeItem: removeItemMutation,
        decideRestock: async (args) => {
          const result = await decideRestock(args);
          if (hasActiveListConflict(result)) {
            throw new OfflineTerminalConflictError(
              "restocks.active_list_changed",
            );
          }
          return result;
        },
        completeShop: completeOfflineSession,
        recalculateReminders: () => recalculateReminders({}),
      }),
    [
      addItem,
      completeOfflineSession,
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
    if (replay.length === 0) {
      setHasSyncError(false);
      return { success: 0, failed: 0 };
    }

    processingRef.current = true;
    const replayIds = new Set(replay.map((operation) => operation.id));
    inFlightOperationIdsRef.current = replayIds;
    setIsProcessing(true);
    setHasSyncError(false);
    syncStatus?.startSyncing(replay.length);

    // Stop at the first retryable failure so later writes never overtake an
    // earlier dependency. Terminal conflicts are recorded and skipped so
    // unrelated work later in the queue can still sync.
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
    const {
      success,
      failed,
      conflicts: replayConflicts,
      remaining,
    } = replayResult;

    const operationsQueuedDuringReplay = getStoredQueue(processingScope).filter(
      (operation) => !replayIds.has(operation.id),
    );
    const nextQueue = [...remaining, ...operationsQueuedDuringReplay].sort(
      (a, b) => a.queuedAt - b.queuedAt,
    );
    const nextConflicts = [
      ...getStoredConflicts(processingScope).filter(
        (conflict) =>
          !replayConflicts.some((candidate) => candidate.id === conflict.id),
      ),
      ...replayConflicts,
    ];
    saveQueue(processingScope, nextQueue);
    saveConflicts(processingScope, nextConflicts);
    if (scopeRef.current && scopesMatch(scopeRef.current, processingScope)) {
      setQueue(nextQueue);
      setConflicts(nextConflicts);
      setHasSyncError(failed > 0 || replayConflicts.length > 0);
    }

    processingRef.current = false;
    inFlightOperationIdsRef.current = new Set();
    setIsProcessing(false);
    syncStatus?.finishSyncing({ success, failed });
    return { success, failed };
  }, [executeOperation, syncStatus]);

  const clearQueue = useCallback(() => {
    if (!scope) return;
    saveQueue(scope, []);
    saveConflicts(scope, []);
    setQueue([]);
    setConflicts([]);
    setHasSyncError(false);
  }, [scope]);

  const dismissConflict = useCallback((conflictId: string) => {
    const currentScope = scopeRef.current;
    if (!currentScope) return;
    setConflicts((current) => {
      const next = current.filter((conflict) => conflict.id !== conflictId);
      saveConflicts(currentScope, next);
      return next;
    });
  }, []);

  useEffect(() => {
    // Never replay the legacy globally-scoped queue.
    removeItem(StorageKeys.OFFLINE_QUEUE);
    setQueue(getStoredQueue(scope));
    setConflicts(getStoredConflicts(scope));
    setHasSyncError(false);
  }, [scope]);

  useEffect(
    () => () => {
      scopeRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (isConnected && queue.length > 0 && !processingRef.current) {
      void processQueue();
    }
  }, [isConnected, processQueue, queue.length]);

  return {
    scope,
    queue,
    conflicts,
    isProcessing,
    hasSyncError,
    queueLength: queue.length,
    isOnline: isConnected,
    addToQueue,
    processQueue,
    clearQueue,
    dismissConflict,
  };
}

type OfflineQueueController = ReturnType<typeof useOfflineQueueController>;

const OfflineQueueContext = createContext<OfflineQueueController | null>(null);

function OfflineQueueControllerProvider({
  children,
  scope,
}: {
  children?: ReactNode;
  scope: OfflineScope | null;
}) {
  const controller = useOfflineQueueController(scope);
  return createElement(
    OfflineQueueContext.Provider,
    { value: controller },
    children,
  );
}

export function OfflineQueueProvider({
  children,
  scope,
}: {
  children: ReactNode;
  scope: OfflineScope | null;
}) {
  return createElement(
    OfflineQueueControllerProvider,
    {
      key: scope ? getOfflineQueueStorageKey(scope) : "signed-out",
      scope,
    },
    children,
  );
}

const unavailableQueueResult = async () => ({ success: 0, failed: 0 });
const ignoreQueueAction = () => undefined;

/**
 * Read the app-wide queue coordinator for the requested signed-in scope.
 * A stale screen can neither read nor enqueue work after the provider changes
 * user or household.
 */
export function useScopedOfflineQueue(scope: OfflineScope | null) {
  const controller = useContext(OfflineQueueContext);
  if (!controller) {
    throw new Error(
      "useScopedOfflineQueue must be used within OfflineQueueProvider",
    );
  }

  const scopeMatches = Boolean(
    scope && controller.scope && scopesMatch(scope, controller.scope),
  );
  if (scopeMatches) return controller;

  return {
    ...controller,
    scope: null,
    queue: [] as OfflineOperation[],
    conflicts: [] as OfflineConflict[],
    isProcessing: false,
    hasSyncError: false,
    queueLength: 0,
    addToQueue: (_input: NewOfflineOperation): never => {
      throw new Error(
        "Offline sync is unavailable until the signed-in household is loaded",
      );
    },
    processQueue: unavailableQueueResult,
    clearQueue: ignoreQueueAction,
    dismissConflict: ignoreQueueAction,
  };
}
