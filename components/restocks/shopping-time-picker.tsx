import DateTimePicker from "@react-native-community/datetimepicker";
import { Clock } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { themeColors } from "@/lib/theme";

export interface ShoppingTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
}

export function ShoppingTimePicker({
  value,
  onChange,
  disabled = false,
}: ShoppingTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [hour, minute] = value.split(":").map(Number);
  // This picker edits only a wall clock. The sheet applies the household zone
  // and selected calendar date when saving, including daylight-saving checks.
  const clock = new Date(Date.UTC(2000, 0, 1, hour, minute));

  return (
    <View className="mt-5">
      <Text className="mb-2 font-semibold text-ink">Time (24-hour)</Text>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Choose shopping time"
        accessibilityValue={{ text: value }}
        accessibilityState={{ disabled, expanded: open && !disabled }}
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-separator bg-white px-4 py-3 disabled:opacity-50"
      >
        <Text className="text-base text-ink" style={{ fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
        <Clock size={20} color={themeColors.secondaryInk} />
      </Pressable>
      {open && !disabled && (
        <DateTimePicker
          value={clock}
          mode="time"
          display={process.env.EXPO_OS === "android" ? "default" : "spinner"}
          timeZoneName="UTC"
          is24Hour
          locale="en-GB"
          themeVariant="light"
          textColor={themeColors.ink}
          accessibilityLabel="Shopping time"
          onChange={(event, selectedDate) => {
            if (process.env.EXPO_OS === "android") setOpen(false);
            if (event.type !== "set" || !selectedDate) return;
            const hours = String(selectedDate.getUTCHours()).padStart(2, "0");
            const minutes = String(selectedDate.getUTCMinutes()).padStart(2, "0");
            onChange(`${hours}:${minutes}`);
          }}
        />
      )}
    </View>
  );
}
