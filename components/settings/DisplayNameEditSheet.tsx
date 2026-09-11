import {
  Button,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSheetHeader,
  Input,
  type GlassBottomSheetRef,
} from "@/components/ui";
import { themeColors } from "@/lib/theme";
import { UserRound } from "lucide-react-native";
import { forwardRef } from "react";

interface DisplayNameEditSheetProps {
  value: string;
  onChangeText: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  error?: string;
  isSaving: boolean;
}

export const DisplayNameEditSheet = forwardRef<
  GlassBottomSheetRef,
  DisplayNameEditSheetProps
>(function DisplayNameEditSheet(
  { value, onChangeText, onSave, onClose, error, isSaving },
  ref,
) {
  return (
    <GlassBottomSheet ref={ref} enableDynamicSizing dismissible={!isSaving}>
      <GlassBottomSheetScrollView contentContainerClassName="px-6 pb-10 pt-2">
        <GlassSheetHeader
          title="Your display name"
          description="This is how your name appears to your household."
          icon={<UserRound size={21} color={themeColors.coral} strokeWidth={2} />}
          tone="coral"
          onClose={onClose}
          closeDisabled={isSaving}
          closeAccessibilityLabel="Close display name editor"
        />
        <Input
          label="Display name"
          value={value}
          onChangeText={onChangeText}
          placeholder="Enter your name"
          maxLength={60}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
          returnKeyType="done"
          onSubmitEditing={onSave}
          editable={!isSaving}
          error={error}
          accessibilityLabel="Display name"
          containerClassName="mb-5"
        />
        <Button
          onPress={onSave}
          loading={isSaving}
          disabled={isSaving}
          size="lg"
          className="w-full"
          accessibilityLabel="Save display name"
        >
          Save name
        </Button>
      </GlassBottomSheetScrollView>
    </GlassBottomSheet>
  );
});
