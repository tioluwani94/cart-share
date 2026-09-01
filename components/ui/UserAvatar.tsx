import { useState, useCallback, useRef } from "react";
import { Text, Image, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  GlassBottomSheet,
  GlassBottomSheetView,
  type GlassBottomSheetRef,
} from "./GlassBottomSheet";
import { GlassSheetHeader } from "./GlassSheetHeader";

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
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const initials = getInitials(name);
  const [primaryColor] = getColorForName(name);
  const isInteractive = Boolean(onPress || showTooltip);

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
    if (!reduceMotion) {
      scale.value = withSpring(0.97, {
        damping: 28,
        stiffness: 520,
        mass: 0.7,
        overshootClamping: true,
      });
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = reduceMotion
      ? 1
      : withSpring(1, {
          damping: 28,
          stiffness: 520,
          mass: 0.7,
          overshootClamping: true,
        });
  }, [reduceMotion, scale]);

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
        onLongPress={showTooltip ? handleLongPress : undefined}
        onPressIn={isInteractive ? handlePressIn : undefined}
        onPressOut={isInteractive ? handlePressOut : undefined}
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
            <GlassSheetHeader
              title={name}
              description={tooltipPrefix}
              icon={
              <View
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                  backgroundColor: primaryColor,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {imageUrl && !imageError ? (
                  <Image
                    source={{ uri: imageUrl }}
                      style={{ width: 32, height: 32 }}
                    accessibilityLabel={`${name}'s avatar`}
                  />
                ) : (
                    <Text className="text-sm font-semibold text-white">
                    {initials}
                  </Text>
                )}
              </View>
              }
              tone="neutral"
              onClose={dismissTooltip}
              closeAccessibilityLabel="Close profile details"
            />
          </GlassBottomSheetView>
        </GlassBottomSheet>
      ) : null}
    </>
  );
}
