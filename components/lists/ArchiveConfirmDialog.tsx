import { View } from "react-native";
import * as Haptics from "expo-haptics";
import { Archive } from "lucide-react-native";
import {
  Button,
  ControlledGlassBottomSheet,
  GlassBottomSheetView,
  GlassSheetHeader,
} from "@/components/ui";
import { themeColors } from "@/lib/theme";

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
        <GlassSheetHeader
          title="Archive this list?"
          description={`“${listName}” will move to archived lists. You can restore it later from Settings.`}
          icon={<Archive size={21} color={themeColors.error} strokeWidth={2} />}
          tone="danger"
          onClose={handleCancelPress}
          closeDisabled={isLoading}
          closeAccessibilityLabel="Keep list"
        />

        <View className="gap-3">
          <Button
            onPress={handleConfirm}
            variant="danger"
            size="lg"
            loading={isLoading}
            accessibilityLabel="Confirm archive"
          >
            Archive list
          </Button>
          <Button
            onPress={handleCancelPress}
            variant="ghost"
            size="lg"
            disabled={isLoading}
            accessibilityLabel="Keep list"
          >
            Keep list
          </Button>
        </View>
      </GlassBottomSheetView>
    </ControlledGlassBottomSheet>
  );
}
