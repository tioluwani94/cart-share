import { View, Text } from "react-native";
import * as Haptics from "expo-haptics";
import {
  Button,
  ControlledGlassBottomSheet,
  GlassBottomSheetView,
} from "@/components/ui";

interface ArchiveConfirmDialogProps {
  visible: boolean;
  listName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ArchiveConfirmDialog({
  visible,
  listName,
  onConfirm,
  onCancel,
  isLoading,
}: ArchiveConfirmDialogProps) {
  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm();
  };

  const handleCancelPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  return (
    <ControlledGlassBottomSheet
      visible={visible}
      onClose={onCancel}
      enableDynamicSizing
      dismissible={!isLoading}
    >
      <GlassBottomSheetView className="px-6 pb-10 pt-2">
        <View className="mb-4 items-center">
          <Text className="text-5xl">📦</Text>
        </View>

        <Text className="mb-2 text-center text-xl font-bold text-warm-gray-900">
          Archive this list?
        </Text>

        <Text className="mb-6 text-center text-base leading-6 text-warm-gray-600">
          “{listName}” will be moved to your archived lists. You can always
          restore it later from Settings.
        </Text>

        <View className="gap-3">
          <Button
            onPress={handleConfirm}
            variant="primary"
            size="lg"
            loading={isLoading}
            accessibilityLabel="Confirm archive"
          >
            Yes, archive it
          </Button>
          <Button
            onPress={handleCancelPress}
            variant="ghost"
            size="lg"
            disabled={isLoading}
            accessibilityLabel="Keep list"
          >
            Keep it
          </Button>
        </View>
      </GlassBottomSheetView>
    </ControlledGlassBottomSheet>
  );
}
