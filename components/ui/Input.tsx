import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";

interface InputProps extends Omit<TextInputProps, "className"> {
  label: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  className,
  containerClassName,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={cn("mb-4", containerClassName)}>
      <Text className="mb-2 text-sm font-semibold text-ink">{label}</Text>
      <TextInput
        className={cn(
          "min-h-[52px] rounded-xl border border-separator bg-surface px-4 py-3 text-base text-ink",
          isFocused && "border-coral",
          error && "border-red-600",
          className,
        )}
        placeholderTextColor={themeColors.secondaryInk}
        accessibilityLabel={label}
        accessibilityHint={error}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error && (
        <Text className="mt-2 text-sm text-red-700" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}
