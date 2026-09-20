import { Text, View } from "react-native";
import { themeColors } from "@/lib/theme";
import type { ShoppingTimePickerProps } from "./shopping-time-picker";

export function ShoppingTimePicker({
  value,
  onChange,
  disabled = false,
}: ShoppingTimePickerProps) {
  const [hour, minute] = value.split(":");
  const selectStyle = {
    minHeight: 48,
    flex: 1,
    borderRadius: 12,
    border: `1px solid ${themeColors.separator}`,
    backgroundColor: "white",
    color: themeColors.ink,
    padding: 12,
    fontSize: 16,
  };

  return (
    <View className="mt-5">
      <Text className="mb-2 font-semibold text-ink">Time (24-hour)</Text>
      <View className="flex-row items-center gap-2">
        <select
          aria-label="Shopping hour"
          value={hour}
          disabled={disabled}
          onChange={(event) => onChange(`${event.target.value}:${minute}`)}
          style={selectStyle}
        >
          {Array.from({ length: 24 }, (_, index) => {
            const option = String(index).padStart(2, "0");
            return <option key={option} value={option}>{option}</option>;
          })}
        </select>
        <Text className="text-base text-ink">:</Text>
        <select
          aria-label="Shopping minute"
          value={minute}
          disabled={disabled}
          onChange={(event) => onChange(`${hour}:${event.target.value}`)}
          style={selectStyle}
        >
          {Array.from({ length: 60 }, (_, index) => {
            const option = String(index).padStart(2, "0");
            return <option key={option} value={option}>{option}</option>;
          })}
        </select>
      </View>
    </View>
  );
}
