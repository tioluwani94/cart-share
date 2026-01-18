import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNetworkStatus } from "../../lib/useNetworkStatus";
import { useSyncStatusSafe, SyncStatus } from "../../lib/SyncStatusContext";

/**
 * Cloud icon for offline state
 */
function CloudOffIcon() {
  return (
    <View className="w-5 h-5 items-center justify-center">
      <Text className="text-base">☁️</Text>
    </View>
  );
}

/**
 * Checkmark icon for back online/synced state
 */
function CheckIcon() {
  return (
    <View className="w-5 h-5 items-center justify-center">
      <Text className="text-base">✓</Text>
    </View>
  );
}

/**
 * Syncing spinner component
 */
function SyncSpinner() {
  return (
    <ActivityIndicator
      size="small"
      color="#1A1A2E"
      style={{ width: 20, height: 20 }}
    />
  );
}

interface OfflineIndicatorProps {
  /** Optional callback when network status changes */
  onStatusChange?: (isOnline: boolean) => void;
}

/**
 * Banner state types for UI rendering.
 */
type BannerState = "hidden" | "offline" | "syncing" | "synced" | "online";

/**
 * OfflineIndicator - A friendly banner that shows when the user is offline
 *
 * Features:
 * - Yellow banner with cloud icon when offline
 * - Yellow banner with spinner when syncing: "Syncing..."
 * - Teal banner with checkmark when synced: "All synced!"
 * - Slides down smoothly when offline
 * - Haptic feedback on status changes
 */
export function OfflineIndicator({ onStatusChange }: OfflineIndicatorProps) {
  const { isConnected, justCameOnline } = useNetworkStatus();
  const syncStatusContext = useSyncStatusSafe();
  const syncStatus = syncStatusContext?.status ?? "idle";
  const lastResult = syncStatusContext?.lastResult ?? null;
  const [bannerState, setBannerState] = useState<BannerState>("hidden");
  const [previousSyncStatus, setPreviousSyncStatus] = useState<SyncStatus>("idle");

  // Animation values
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Show the banner with animation
  const showBanner = () => {
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(1, { duration: 200 });
  };

  // Hide the banner with animation
  const hideBanner = () => {
    translateY.value = withSpring(-100, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(0, { duration: 200 });
    // Reset state after animation
    setTimeout(() => {
      setBannerState("hidden");
    }, 300);
  };

  // Handle offline state
  useEffect(() => {
    onStatusChange?.(isConnected);

    if (!isConnected) {
      // Show offline banner
      setBannerState("offline");
      showBanner();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [isConnected]);

  // Handle sync status changes
  useEffect(() => {
    // Detect transition to syncing
    if (syncStatus === "syncing" && previousSyncStatus !== "syncing") {
      setBannerState("syncing");
      showBanner();
    }

    // Detect transition to synced
    if (syncStatus === "synced" && previousSyncStatus === "syncing") {
      setBannerState("synced");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Hide after showing success for 2 seconds
      setTimeout(() => {
        hideBanner();
      }, 2000);
    }

    // Detect transition back to idle (no pending mutations, online)
    if (syncStatus === "idle" && previousSyncStatus === "synced") {
      // Already hidden by the synced timeout
    }

    // Handle when coming online with no pending items
    if (justCameOnline && syncStatus === "idle" && bannerState === "offline") {
      // Just came online, no sync needed
      setBannerState("online");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        hideBanner();
      }, 2000);
    }

    setPreviousSyncStatus(syncStatus);
  }, [syncStatus, justCameOnline, bannerState, previousSyncStatus]);

  // Get banner content based on state
  const getBannerConfig = () => {
    switch (bannerState) {
      case "offline":
        return {
          icon: <CloudOffIcon />,
          message: "You're offline — no worries, we've got your list!",
          bgClass: "bg-yellow",
          textClass: "text-warm-gray-800",
        };
      case "syncing":
        return {
          icon: <SyncSpinner />,
          message: "Syncing...",
          bgClass: "bg-yellow",
          textClass: "text-warm-gray-800",
        };
      case "synced":
        return {
          icon: <CheckIcon />,
          message: "All synced!",
          bgClass: "bg-teal",
          textClass: "text-white",
        };
      case "online":
        return {
          icon: <CheckIcon />,
          message: "You're back online!",
          bgClass: "bg-teal",
          textClass: "text-white",
        };
      default:
        return null;
    }
  };

  const config = getBannerConfig();

  // Don't render if banner shouldn't be shown
  if (bannerState === "hidden" || !config) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      className={config.bgClass}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={config.message}
    >
      <View className="flex-row items-center justify-center px-4 py-3">
        {config.icon}
        <Text className={`ml-2 text-sm font-medium ${config.textClass}`}>
          {config.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default OfflineIndicator;
