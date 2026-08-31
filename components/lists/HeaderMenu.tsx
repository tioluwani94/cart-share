import * as Haptics from "expo-haptics";
import { Archive, MoreHorizontal } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { Pressable, Text, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  GlassBottomSheet,
  GlassBottomSheetView,
  type GlassBottomSheetRef,
} from "@/components/ui";

interface HeaderMenuProps {
  onArchive: () => void;
}

export function HeaderMenu({ onArchive }: HeaderMenuProps) {
  const sheetRef = useRef<GlassBottomSheetRef>(null);
  const archiveAfterDismissRef = useRef(false);
  const buttonScale = useSharedValue(1);

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sheetRef.current?.present();
  };

  const handleArchive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    archiveAfterDismissRef.current = true;
    sheetRef.current?.dismiss();
  };

  const handleDismiss = useCallback(() => {
    if (!archiveAfterDismissRef.current) return;

    archiveAfterDismissRef.current = false;
    requestAnimationFrame(onArchive);
  }, [onArchive]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  return (
    <>
      {/* Menu button */}
      <Animated.View style={buttonStyle}>
        <TouchableOpacity
          onPress={openMenu}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className="h-11 w-11 items-center justify-center rounded-full bg-warm-gray-100"
          accessibilityLabel="More options"
          accessibilityRole="button"
        >
          <MoreHorizontal size={22} color="#57534E" strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      <GlassBottomSheet
        ref={sheetRef}
        enableDynamicSizing
        onDismiss={handleDismiss}
      >
        <GlassBottomSheetView className="px-6 pb-10 pt-2">
          <Text className="mb-3 text-xl font-bold text-warm-gray-900">
            List options
          </Text>
          <Pressable
            onPress={handleArchive}
            className="min-h-14 flex-row items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 active:bg-warm-gray-100"
            accessibilityLabel="Archive list"
            accessibilityRole="button"
          >
            <Archive size={20} color="#78716C" strokeWidth={2} />
            <Text className="text-base font-medium text-warm-gray-700">
              Archive list
            </Text>
          </Pressable>
        </GlassBottomSheetView>
      </GlassBottomSheet>
    </>
  );
}
