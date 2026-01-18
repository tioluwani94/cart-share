import React, { createContext, useContext, useState, useCallback, useRef } from "react";

/**
 * Sync status states for the offline queue.
 */
export type SyncStatus = "idle" | "syncing" | "synced" | "error";

/**
 * Sync result information.
 */
export interface SyncResult {
  success: number;
  failed: number;
}

/**
 * Context value for sync status.
 */
interface SyncStatusContextValue {
  /** Current sync status */
  status: SyncStatus;
  /** Result from the last sync operation */
  lastResult: SyncResult | null;
  /** Number of items pending sync */
  pendingCount: number;
  /** Start syncing (called by useOfflineQueue) */
  startSyncing: (count: number) => void;
  /** Finish syncing with result (called by useOfflineQueue) */
  finishSyncing: (result: SyncResult) => void;
  /** Reset status to idle (e.g., after showing success message) */
  resetStatus: () => void;
  /** Set error status */
  setError: () => void;
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

/**
 * Provider component for sync status.
 * Wrap your app with this to enable sync status tracking.
 */
export function SyncStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSyncing = useCallback((count: number) => {
    // Clear any pending reset timeout
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setPendingCount(count);
    setStatus("syncing");
    console.log(`[SyncStatus] Started syncing ${count} items`);
  }, []);

  const finishSyncing = useCallback((result: SyncResult) => {
    setLastResult(result);
    setPendingCount(0);

    if (result.failed > 0 && result.success === 0) {
      setStatus("error");
      console.log(`[SyncStatus] Sync failed: ${result.failed} items`);
    } else {
      setStatus("synced");
      console.log(`[SyncStatus] Sync complete: ${result.success} success, ${result.failed} failed`);

      // Auto-reset to idle after showing success
      resetTimeoutRef.current = setTimeout(() => {
        setStatus("idle");
        resetTimeoutRef.current = null;
      }, 2500);
    }
  }, []);

  const resetStatus = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    setStatus("idle");
    setLastResult(null);
    setPendingCount(0);
  }, []);

  const setError = useCallback(() => {
    setStatus("error");
  }, []);

  return (
    <SyncStatusContext.Provider
      value={{
        status,
        lastResult,
        pendingCount,
        startSyncing,
        finishSyncing,
        resetStatus,
        setError,
      }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
}

/**
 * Hook to access sync status.
 * Must be used within a SyncStatusProvider.
 */
export function useSyncStatus(): SyncStatusContextValue {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error("useSyncStatus must be used within a SyncStatusProvider");
  }
  return context;
}

/**
 * Hook to access sync status safely (returns null if not in provider).
 * Use this when the provider might not be available.
 */
export function useSyncStatusSafe(): SyncStatusContextValue | null {
  return useContext(SyncStatusContext);
}

/**
 * Hook to check if currently syncing.
 */
export function useIsSyncing(): boolean {
  const { status } = useSyncStatus();
  return status === "syncing";
}
