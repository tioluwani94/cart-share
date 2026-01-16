import { useState, useEffect } from "react";
import { TextInput, View, Text, TextInputProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";

interface InputProps extends Omit<TextInputProps, "className"> {
  label: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  value,
  onFocus,
  onBlur,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const labelPosition = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    if (value || isFocused) {
      labelPosition.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    } else {
      labelPosition.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isFocused, value, labelPosition]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(labelPosition.value, [0, 1], [16, 0]);
    const scale = interpolate(labelPosition.value, [0, 1], [1, 0.85]);
    const translateX = interpolate(labelPosition.value, [0, 1], [0, -4]);

    return {
      transform: [{ translateY }, { scale }, { translateX }],
    };
  });

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View className={cn("mb-4", containerClassName)}>
      <View className="relative">
        <Animated.Text
          style={animatedLabelStyle}
          className={cn(
            "absolute left-4 z-10 bg-white px-1",
            isFocused ? "text-teal" : "text-warm-gray-500",
            error && "text-coral"
          )}
        >
          {label}
        </Animated.Text>
        <TextInput
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "min-h-[56px] rounded-2xl border-2 px-4 pt-4 text-base text-warm-gray-900",
            isFocused ? "border-teal" : "border-warm-gray-200",
            error && "border-coral",
            className
          )}
          placeholderTextColor="#A9A69E"
          accessibilityLabel={label}
          accessibilityHint={error}
          {...props}
        />
      </View>
      {error && (
        <Text className="mt-2 px-2 text-sm text-coral">{error}</Text>
      )}
    </View>
  );
}
