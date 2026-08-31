import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

const OFFLINE_REFRESH_INTERVAL_MS = 1000;
const offlineRefreshConsumers = new Set<symbol>();
let offlineRefreshTimer: ReturnType<typeof setInterval> | null = null;

function refreshNetworkState(): void {
  // A failed refresh is expected while a device is offline. The next bounded
  // attempt will try again without surfacing a noisy user-facing error.
  void NetInfo.refresh().catch(() => undefined);
}

function addOfflineRefreshConsumer(consumerId: symbol): void {
  offlineRefreshConsumers.add(consumerId);
  if (offlineRefreshTimer) return;

  refreshNetworkState();
  offlineRefreshTimer = setInterval(
    refreshNetworkState,
    OFFLINE_REFRESH_INTERVAL_MS,
  );
}

function removeOfflineRefreshConsumer(consumerId: symbol): void {
  offlineRefreshConsumers.delete(consumerId);
  if (offlineRefreshConsumers.size > 0 || !offlineRefreshTimer) return;

  clearInterval(offlineRefreshTimer);
  offlineRefreshTimer = null;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  /** True when transitioning from offline to online */
  justCameOnline: boolean;
}

/**
 * Hook to track network connectivity status
 * Uses @react-native-community/netinfo for accurate network detection
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    justCameOnline: false,
  });

  const wasOfflineRef = useRef(false);
  const offlineRefreshConsumerRef = useRef(
    Symbol("offline-refresh-consumer"),
  );
  const resetOnlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleNetworkChange = useCallback(
    (state: NetInfoState) => {
      const isConnected = state.isConnected ?? true;
      const isInternetReachable = state.isInternetReachable;

      // Detect if we just came back online
      const justCameOnline = wasOfflineRef.current && isConnected;

      setStatus({
        isConnected,
        isInternetReachable,
        type: state.type,
        justCameOnline,
      });

      // Update wasOffline for next comparison
      if (!isConnected) {
        wasOfflineRef.current = true;
        if (resetOnlineTimerRef.current) {
          clearTimeout(resetOnlineTimerRef.current);
          resetOnlineTimerRef.current = null;
        }
      } else if (justCameOnline) {
        // Reset justCameOnline after a short delay
        if (resetOnlineTimerRef.current) {
          clearTimeout(resetOnlineTimerRef.current);
        }
        resetOnlineTimerRef.current = setTimeout(() => {
          setStatus((prev) => ({ ...prev, justCameOnline: false }));
          wasOfflineRef.current = false;
          resetOnlineTimerRef.current = null;
        }, 3000);
      }
    },
    [],
  );

  useEffect(() => {
    // NetInfo invokes new listeners with the current state, then publishes
    // subsequent changes. Keeping one stable subscription avoids a gap where
    // a fast reconnect event could be lost between effect clean-up and setup.
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    return () => {
      unsubscribe();
      if (resetOnlineTimerRef.current) {
        clearTimeout(resetOnlineTimerRef.current);
      }
    };
  }, [handleNetworkChange]);

  useEffect(() => {
    if (status.isConnected) return;

    const consumerId = offlineRefreshConsumerRef.current;
    addOfflineRefreshConsumer(consumerId);
    return () => removeOfflineRefreshConsumer(consumerId);
  }, [status.isConnected]);

  return status;
}

/**
 * Simple hook that just returns whether we're online or offline
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus();
  return isConnected;
}
