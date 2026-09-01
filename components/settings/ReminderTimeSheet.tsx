import {
  GlassBottomSheet,
  GlassBottomSheetView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
} from "@/components/ui";
import { themeColors } from "@/lib/theme";
import { Bell } from "lucide-react-native";
import { forwardRef } from "react";
import { Text, View } from "react-native";
import { SettingsChoiceRow } from "./SettingsPrimitives";

export interface ReminderTimeOption {
  label: string;
  value: string;
  accessibilityLabel: string;
}

interface ReminderTimeSheetProps {
  value: string;
  options: readonly ReminderTimeOption[];
  onValueChange: (value: string) => void;
  onClose: () => void;
  error?: string | null;
  isSaving?: boolean;
}

export const ReminderTimeSheet = forwardRef<
  GlassBottomSheetRef,
  ReminderTimeSheetProps
>(function ReminderTimeSheet(
  {
    value,
    options,
    onValueChange,
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
          title="Reminder time"
          description="Choose when restock prompts should arrive. We still keep 20:00–08:00 quiet."
          icon={<Bell size={21} color={themeColors.coral} strokeWidth={2} />}
          onClose={onClose}
          closeDisabled={isSaving}
          closeAccessibilityLabel="Close reminder time picker"
        />

        <View className="overflow-hidden rounded-2xl border border-separator bg-surface">
          {options.map((option, index) => (
            <SettingsChoiceRow
              key={option.value}
              label={option.label}
              selected={option.value === value}
              onPress={() => onValueChange(option.value)}
              disabled={isSaving}
              isLast={index === options.length - 1}
              accessibilityLabel={option.accessibilityLabel}
            />
          ))}
        </View>

        {error ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            className="mt-3 text-sm leading-5 text-red-700"
          >
            {error}
          </Text>
        ) : null}
      </GlassBottomSheetView>
    </GlassBottomSheet>
  );
});
