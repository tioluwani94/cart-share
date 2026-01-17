import { useState, useCallback } from "react";
import { View, Text, Image, Pressable, Modal } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

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
}

export function UserAvatar({
  name = "User",
  imageUrl,
  size = 24,
  showTooltip = true,
  tooltipPrefix = "Added by",
}: UserAvatarProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
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
      setTooltipVisible(true);
    }
  }, [showTooltip]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const dismissTooltip = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fontSize = size * 0.45;

  return (
    <>
      <Pressable
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={300}
        accessibilityLabel={`${tooltipPrefix} ${name}`}
        accessibilityRole="image"
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

      {/* Tooltip Modal */}
      <Modal
        visible={tooltipVisible}
        transparent
        animationType="fade"
        onRequestClose={dismissTooltip}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={dismissTooltip}
        >
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={{
              backgroundColor: "#1A1A2E",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "500" }}>
              {tooltipPrefix} {name}
            </Text>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}
