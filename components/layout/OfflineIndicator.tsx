import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNetworkStatus } from "../../lib/useNetworkStatus";

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
 * Checkmark icon for back online state
 */
function CheckIcon() {
  return (
    <View className="w-5 h-5 items-center justify-center">
      <Text className="text-base">✓</Text>
    </View>
  );
}

interface OfflineIndicatorProps {
  /** Optional callback when network status changes */
  onStatusChange?: (isOnline: boolean) => void;
}

/**
 * OfflineIndicator - A friendly banner that shows when the user is offline
 *
 * Features:
 * - Yellow banner with cloud icon when offline
 * - Friendly, reassuring message
 * - Slides down smoothly when offline
 * - Shows checkmark and slides up when back online
 * - Haptic feedback on status changes
 */
export function OfflineIndicator({ onStatusChange }: OfflineIndicatorProps) {
  const { isConnected, justCameOnline } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [showCheckmark, setShowCheckmark] = useState(false);

  // Animation values
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Handle showing the banner
  const showOfflineBanner = () => {
    setShowBanner(true);
    setShowCheckmark(false);
    setBannerMessage("You're offline — no worries, we've got your list!");
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(1, { duration: 200 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Handle hiding the banner (after coming back online)
  const hideOnlineBanner = () => {
    translateY.value = withSpring(-100, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withTiming(0, { duration: 200 });
    // Reset state after animation
    setTimeout(() => {
      setShowBanner(false);
      setShowCheckmark(false);
    }, 300);
  };

  // Handle showing "back online" message
  const showBackOnline = () => {
    setShowCheckmark(true);
    setBannerMessage("You're back online!");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Hide after 2 seconds
    setTimeout(() => {
      hideOnlineBanner();
    }, 2000);
  };

  useEffect(() => {
    onStatusChange?.(isConnected);

    if (!isConnected) {
      // Show offline banner
      showOfflineBanner();
    } else if (justCameOnline && showBanner) {
      // Just came back online - show success message then hide
      showBackOnline();
    }
  }, [isConnected, justCameOnline]);

  // Don't render if banner shouldn't be shown
  if (!showBanner && isConnected) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      className={`${showCheckmark ? "bg-teal" : "bg-yellow"}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={bannerMessage}
    >
      <View className="flex-row items-center justify-center px-4 py-3">
        {showCheckmark ? <CheckIcon /> : <CloudOffIcon />}
        <Text
          className={`ml-2 text-sm font-medium ${
            showCheckmark ? "text-white" : "text-warm-gray-800"
          }`}
        >
          {bannerMessage}
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
