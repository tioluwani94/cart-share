import * as Haptics from "expo-haptics";
import { Archive, MoreHorizontal } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Button,
  GlassBottomSheet,
  GlassBottomSheetView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
} from "@/components/ui";
import { themeColors } from "@/lib/theme";

interface HeaderMenuProps {
  onArchive: () => void;
}

export function HeaderMenu({ onArchive }: HeaderMenuProps) {
  const sheetRef = useRef<GlassBottomSheetRef>(null);
  const archiveAfterDismissRef = useRef(false);

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

  return (
    <>
      <Button
        onPress={openMenu}
        variant="ghost"
        size="sm"
        iconOnly
        className="border border-separator bg-surface"
        accessibilityLabel="More options"
      >
        <MoreHorizontal
          size={22}
          color={themeColors.secondaryInk}
          strokeWidth={2}
        />
      </Button>

      <GlassBottomSheet
        ref={sheetRef}
        enableDynamicSizing
        onDismiss={handleDismiss}
      >
        <GlassBottomSheetView className="px-6 pb-10 pt-2">
          <GlassSheetHeader
            title="List options"
            description="Manage this shopping list."
            icon={
              <MoreHorizontal
                size={21}
                color={themeColors.secondaryInk}
                strokeWidth={2}
              />
            }
            tone="neutral"
            onClose={() => sheetRef.current?.dismiss()}
            closeAccessibilityLabel="Close list options"
          />
          <Pressable
            onPress={handleArchive}
            className="min-h-16 flex-row items-center border-y border-separator px-1 py-3 active:bg-warm-gray-100"
            accessibilityLabel="Archive list"
            accessibilityRole="button"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-coral-soft">
              <Archive size={20} color={themeColors.coral} strokeWidth={2} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink">Archive list</Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                Move it out of your active lists
              </Text>
            </View>
          </Pressable>
        </GlassBottomSheetView>
      </GlassBottomSheet>
    </>
  );
}
