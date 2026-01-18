import { useEffect, useState, useCallback } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

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

  const [wasOffline, setWasOffline] = useState(false);

  const handleNetworkChange = useCallback(
    (state: NetInfoState) => {
      const isConnected = state.isConnected ?? true;
      const isInternetReachable = state.isInternetReachable;

      // Detect if we just came back online
      const justCameOnline = wasOffline && isConnected;

      setStatus({
        isConnected,
        isInternetReachable,
        type: state.type,
        justCameOnline,
      });

      // Update wasOffline for next comparison
      if (!isConnected) {
        setWasOffline(true);
      } else if (justCameOnline) {
        // Reset justCameOnline after a short delay
        setTimeout(() => {
          setStatus((prev) => ({ ...prev, justCameOnline: false }));
          setWasOffline(false);
        }, 3000);
      }
    },
    [wasOffline]
  );

  useEffect(() => {
    // Fetch initial state
    NetInfo.fetch().then(handleNetworkChange);

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    return () => {
      unsubscribe();
    };
  }, [handleNetworkChange]);

  return status;
}

/**
 * Simple hook that just returns whether we're online or offline
 */
export function useIsOnline(): boolean {
  const { isConnected } = useNetworkStatus();
  return isConnected;
}
