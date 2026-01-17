import { View, Text, Pressable, Modal } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/ui";

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

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        className="flex-1 items-center justify-center bg-black/50 px-6"
      >
        <Pressable
          className="absolute inset-0"
          onPress={onCancel}
          accessibilityLabel="Close dialog"
        />
        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown.duration(200)}
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
        >
          {/* Icon */}
          <View className="mb-4 items-center">
            <Text className="text-5xl">📦</Text>
          </View>

          {/* Title */}
          <Text className="mb-2 text-center text-xl font-bold text-warm-gray-900">
            Archive this list?
          </Text>

          {/* Description */}
          <Text className="mb-6 text-center text-base text-warm-gray-600">
            "{listName}" will be moved to your archived lists. You can always
            restore it later from Settings.
          </Text>

          {/* Buttons */}
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
              onPress={handleCancel}
              variant="ghost"
              size="lg"
              disabled={isLoading}
              accessibilityLabel="Cancel"
            >
              Keep it
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
