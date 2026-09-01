import {
  AmountInput,
  Button,
  GlassBottomSheet,
  GlassBottomSheetView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
} from "@/components/ui";
import { themeColors } from "@/lib/theme";
import { PiggyBank } from "lucide-react-native";
import { forwardRef } from "react";

interface BudgetEditSheetProps {
  value: string;
  onChangeText: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  error?: string;
  isSaving?: boolean;
}

export const BudgetEditSheet = forwardRef<
  GlassBottomSheetRef,
  BudgetEditSheetProps
>(function BudgetEditSheet(
  {
    value,
    onChangeText,
    onSave,
    onClose,
    error,
    isSaving = false,
  },
  ref,
) {
  return (
    <GlassBottomSheet
      ref={ref}
      enableDynamicSizing
      dismissible={!isSaving}
    >
      <GlassBottomSheetView className="px-6 pb-10 pt-2">
        <GlassSheetHeader
          title="Monthly grocery budget"
          description="Set a calm monthly guide for the whole household. Leave it blank to remove the guide."
          icon={
            <PiggyBank size={21} color={themeColors.teal} strokeWidth={2} />
          }
          tone="teal"
          onClose={onClose}
          closeDisabled={isSaving}
          closeAccessibilityLabel="Close monthly budget editor"
        />

        <AmountInput
          label="Budget in pounds"
          value={value}
          onChangeText={onChangeText}
          error={error}
          placeholder="e.g. 400"
          returnKeyType="done"
          onSubmitEditing={onSave}
          editable={!isSaving}
          accessibilityLabel="Monthly grocery budget amount"
          accessibilityHint="Enter the household monthly budget in pounds and pence"
          containerClassName="mb-5"
        />

        <Button
          variant="primary"
          size="lg"
          onPress={onSave}
          loading={isSaving}
          disabled={isSaving}
          className="w-full"
          accessibilityLabel="Save monthly grocery budget"
        >
          Save budget
        </Button>
      </GlassBottomSheetView>
    </GlassBottomSheet>
  );
});
