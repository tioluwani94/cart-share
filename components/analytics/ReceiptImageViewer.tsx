import { View, Text, Modal, Pressable, Image, Dimensions } from "react-native";
import { useState } from "react";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { X, ZoomIn, ZoomOut, Receipt as ReceiptIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ReceiptImageViewerProps {
  visible: boolean;
  imageUrl: string | null;
  sessionDate?: number;
  amount?: number;
  onClose: () => void;
}

/**
 * Format a timestamp to a friendly date string.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format cents to dollar string.
 */
function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/**
 * Full-screen modal for viewing receipt images.
 * Supports zoom and tap to dismiss.
 */
export function ReceiptImageViewer({
  visible,
  imageUrl,
  sessionDate,
  amount,
  onClose,
}: ReceiptImageViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Scale for zoom
  const scale = useSharedValue(1);

  const handleToggleZoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isZoomed) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      setIsZoomed(false);
    } else {
      scale.value = withSpring(1.5, { damping: 15, stiffness: 200 });
      setIsZoomed(true);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Reset zoom on close
    scale.value = 1;
    setIsZoomed(false);
    setImageError(false);
    onClose();
  };

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Dark backdrop */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 bg-black/95"
      >
        {/* Header */}
        <Animated.View
          entering={SlideInDown.delay(100).springify()}
          className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-4 pt-14 pb-4"
        >
          {/* Session info */}
          <View>
            <Text className="text-lg font-semibold text-white">Receipt</Text>
            {sessionDate && (
              <Text className="text-sm text-white/70">
                {formatDate(sessionDate)}
                {amount ? ` · ${formatDollars(amount)}` : ""}
              </Text>
            )}
          </View>

          {/* Close button */}
          <Pressable
            onPress={handleClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
            accessibilityRole="button"
            accessibilityLabel="Close receipt viewer"
          >
            <X size={20} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Receipt image */}
        <View className="flex-1 items-center justify-center px-4">
          {imageUrl && !imageError ? (
            <Pressable onPress={handleToggleZoom}>
              <Animated.View style={imageAnimatedStyle}>
                <Image
                  source={{ uri: imageUrl }}
                  style={{
                    width: SCREEN_WIDTH - 32,
                    height: SCREEN_HEIGHT * 0.65,
                    borderRadius: 16,
                  }}
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              </Animated.View>
            </Pressable>
          ) : (
            <View className="items-center justify-center p-8">
              <View className="h-24 w-24 items-center justify-center rounded-full bg-warm-gray-800">
                <ReceiptIcon size={48} color="#A3A096" strokeWidth={1.5} />
              </View>
              <Text className="mt-4 text-lg font-medium text-white">
                No receipt image
              </Text>
              <Text className="mt-2 text-sm text-white/60 text-center">
                This shopping trip doesn't have a receipt image attached.
              </Text>
            </View>
          )}
        </View>

        {/* Footer with zoom hint */}
        {imageUrl && !imageError && (
          <Animated.View
            entering={SlideInDown.delay(200).springify()}
            exiting={SlideOutDown}
            className="absolute bottom-0 left-0 right-0 pb-10 px-4"
          >
            <Pressable
              onPress={handleToggleZoom}
              className="flex-row items-center justify-center rounded-full bg-white/20 py-3 px-6 self-center"
              accessibilityRole="button"
              accessibilityLabel={isZoomed ? "Zoom out" : "Zoom in"}
            >
              {isZoomed ? (
                <ZoomOut size={18} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <ZoomIn size={18} color="#FFFFFF" strokeWidth={2} />
              )}
              <Text className="ml-2 text-sm font-medium text-white">
                {isZoomed ? "Tap to zoom out" : "Tap to zoom in"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}
