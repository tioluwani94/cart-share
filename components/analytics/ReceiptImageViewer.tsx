import { View, Text, Pressable, Image, Dimensions } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { X, ZoomIn, ZoomOut, Receipt as ReceiptIcon } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  formatCurrencyFromPence,
  formatDateWithWeekday,
} from "@/lib/formatters";
import {
  GlassBottomSheet,
  GlassBottomSheetView,
  type GlassBottomSheetRef,
} from "@/components/ui";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ReceiptImageViewerProps {
  visible: boolean;
  imageUrl: string | null;
  sessionDate?: number;
  amount?: number;
  onClose: () => void;
}

/**
 * Tall bottom sheet for viewing receipt images.
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
  const sheetRef = useRef<GlassBottomSheetRef>(null);
  const isPresentedRef = useRef(false);

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

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => {
        sheetRef.current?.present();
        isPresentedRef.current = true;
      });

      return () => cancelAnimationFrame(frame);
    }

    if (isPresentedRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const resetViewer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = 1;
    setIsZoomed(false);
    setImageError(false);
  }, [scale]);

  const handleClose = () => {
    resetViewer();
    sheetRef.current?.dismiss();
  };

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    scale.value = 1;
    setIsZoomed(false);
    setImageError(false);
    onClose();
  }, [onClose, scale]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GlassBottomSheet
      ref={sheetRef}
      snapPoints={["94%"]}
      onDismiss={handleDismiss}
    >
      <GlassBottomSheetView
        className="flex-1 overflow-hidden rounded-t-[28px] bg-black/95"
        style={{ minHeight: SCREEN_HEIGHT * 0.84 }}
      >
        <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-5 pb-4 pt-5">
          <View>
            <Text className="text-lg font-semibold text-white">Receipt</Text>
            {sessionDate && (
              <Text className="text-sm text-white/70">
                {formatDateWithWeekday(sessionDate)}
                {amount !== undefined
                  ? ` · ${formatCurrencyFromPence(amount)}`
                  : ""}
              </Text>
            )}
          </View>

          <Pressable
            onPress={handleClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            accessibilityRole="button"
            accessibilityLabel="Close receipt viewer"
          >
            <X size={20} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>

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

        {imageUrl && !imageError && (
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-8">
            <Pressable
              onPress={handleToggleZoom}
              className="min-h-12 flex-row items-center justify-center self-center rounded-full bg-white/20 px-6 py-3 active:bg-white/30"
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
          </View>
        )}
      </GlassBottomSheetView>
    </GlassBottomSheet>
  );
}
