import { useState, useCallback, useRef } from "react";
import { Text, Image, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  GlassBottomSheet,
  GlassBottomSheetView,
  type GlassBottomSheetRef,
} from "./GlassBottomSheet";

// Fun gradient color pairs for initials backgrounds
const GRADIENT_COLORS = [
  ["#FF6B6B", "#FF8E8E"], // Coral
  ["#4ECDC4", "#6DE3DC"], // Teal
  ["#FFE66D", "#FFF59D"], // Yellow
  ["#9B59B6", "#BB8FCE"], // Purple
  ["#3498DB", "#5DADE2"], // Blue
  ["#E74C3C", "#F1948A"], // Red
  ["#1ABC9C", "#48C9B0"], // Mint
  ["#F39C12", "#F7C04A"], // Orange
];

// Get consistent color for a name
function getColorForName(name: string): string[] {
  const charCode = name.charCodeAt(0) || 0;
  return GRADIENT_COLORS[charCode % GRADIENT_COLORS.length];
}

// Get initials from name
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface UserAvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
  showTooltip?: boolean;
  tooltipPrefix?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function UserAvatar({
  name = "User",
  imageUrl,
  size = 24,
  showTooltip = true,
  tooltipPrefix = "Added by",
  onPress,
  accessibilityLabel,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const infoSheetRef = useRef<GlassBottomSheetRef>(null);
  const scale = useSharedValue(1);

  const initials = getInitials(name);
  const [primaryColor] = getColorForName(name);

  const handleLongPress = useCallback(() => {
    if (showTooltip) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics not available
      }
      infoSheetRef.current?.present();
    }
  }, [showTooltip]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const dismissTooltip = useCallback(() => {
    infoSheetRef.current?.dismiss();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fontSize = size * 0.45;

  return (
    <>
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={300}
        accessibilityLabel={
          accessibilityLabel ?? `${tooltipPrefix} ${name}`
        }
        accessibilityRole={onPress ? "button" : "image"}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: primaryColor,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              // Subtle shadow for depth
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
            },
          ]}
        >
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: size, height: size }}
              onError={() => setImageError(true)}
              accessibilityLabel={`${name}'s avatar`}
            />
          ) : (
            <Text
              style={{
                fontSize,
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              {initials}
            </Text>
          )}
        </Animated.View>
      </Pressable>

      {showTooltip ? (
        <GlassBottomSheet ref={infoSheetRef} enableDynamicSizing>
          <GlassBottomSheetView className="px-6 pb-10 pt-2">
            <View className="flex-row items-center">
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: primaryColor,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {imageUrl && !imageError ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel={`${name}'s avatar`}
                  />
                ) : (
                  <Text className="text-lg font-semibold text-white">
                    {initials}
                  </Text>
                )}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm text-warm-gray-500">
                  {tooltipPrefix}
                </Text>
                <Text className="mt-0.5 text-lg font-semibold text-warm-gray-900">
                  {name}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={dismissTooltip}
              className="mt-6 min-h-12 items-center justify-center rounded-full bg-white/60 px-5 active:bg-warm-gray-100"
              accessibilityLabel="Close profile details"
              accessibilityRole="button"
            >
              <Text className="text-base font-semibold text-warm-gray-700">
                Done
              </Text>
            </Pressable>
          </GlassBottomSheetView>
        </GlassBottomSheet>
      ) : null}
    </>
  );
}
