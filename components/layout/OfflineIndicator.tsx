import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Animated, {
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  Easing,
  cancelAnimation,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStatus } from "../../lib/useNetworkStatus";
import { useSyncStatusSafe } from "../../lib/SyncStatusContext";

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
type BannerState =
  | "hidden"
  | "offline"
  | "syncing"
  | "synced"
  | "online"
  | "error";

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
  const insets = useSafeAreaInsets();
  const syncStatusContext = useSyncStatusSafe();
  const reduceMotion = useReducedMotion();
  const syncStatus = syncStatusContext?.status ?? "idle";
  const [bannerState, setBannerState] = useState<BannerState>("hidden");
  const previousStatus = useRef({
    isConnected: true,
    syncStatus: "idle",
    justCameOnline: false,
  });
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    onStatusChange?.(isConnected);
  }, [isConnected, onStatusChange]);

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = { isConnected, syncStatus, justCameOnline };
    if (!isConnected) setBannerState("offline");
    else if (syncStatus === "syncing") setBannerState("syncing");
    else if (syncStatus === "error") setBannerState("error");
    else if (syncStatus === "synced" && previous.syncStatus !== "synced")
      setBannerState("synced");
    else if (
      !previous.isConnected ||
      (justCameOnline && !previous.justCameOnline)
    )
      setBannerState("online");
    else if (
      syncStatus === "idle" &&
      (previous.syncStatus === "error" || previous.syncStatus === "syncing")
    )
      setBannerState("hidden");
  }, [isConnected, justCameOnline, syncStatus]);

  // Each visible status owns its timers. A newer warning cancels both the dwell
  // and the dismissal of the previous status, including during an exit fade.
  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    const easing = Easing.bezier(0.23, 1, 0.32, 1);
    if (bannerState === "hidden") {
      opacity.value = 0;
      return;
    }
    translateY.value = reduceMotion
      ? 0
      : withTiming(0, { duration: 180, easing });
    opacity.value = withTiming(1, { duration: 180, easing });
    if (["offline", "error", "online", "synced"].includes(bannerState)) {
      void Haptics.notificationAsync(
        bannerState === "offline" || bannerState === "error"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
    }
    if (bannerState === "online" || bannerState === "synced") {
      dismissTimer = setTimeout(() => {
        translateY.value = reduceMotion
          ? 0
          : withTiming(-8, { duration: 150, easing });
        opacity.value = withTiming(0, { duration: 150, easing });
        hiddenTimer = setTimeout(() => setBannerState("hidden"), 150);
      }, 2000);
    }
    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(hiddenTimer);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [bannerState, opacity, reduceMotion, translateY]);

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
      case "error":
        return {
          icon: <CloudOffIcon />,
          message: "Changes are saved on this device. Sync needs another try.",
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
      style={[animatedStyle, { paddingTop: insets.top }]}
      className={cn("absolute inset-x-0 top-0 z-50 shadow-lg", config.bgClass)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={config.message}
    >
      <View className="flex-row items-center justify-center px-4 py-3">
        {config.icon}
        <Text className={cn("ml-2 text-sm font-medium", config.textClass)}>
          {config.message}
        </Text>
      </View>
    </Animated.View>
  );
}

export default OfflineIndicator;
