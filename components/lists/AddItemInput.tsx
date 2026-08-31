import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { themeColors } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AddItemInputProps {
  onAdd: (name: string) => Promise<void>;
  disabled?: boolean;
}

export function AddItemInput({ onAdd, disabled = false }: AddItemInputProps) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const buttonScale = useSharedValue(1);
  const inputWidth = useSharedValue(1);
  const inputOpacity = useSharedValue(1);

  // Keyboard animation
  const keyboard = useAnimatedKeyboard();

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ scaleX: inputWidth.value }],
  }));

  const handleSubmit = useCallback(async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isSubmitting || disabled) return;

    setIsSubmitting(true);

    // Press animation for button
    buttonScale.value = reduceMotion
      ? 1
      : withSequence(
          withTiming(0.96, { duration: 80 }),
          withTiming(1, { duration: 120 }),
        );

    try {
      await onAdd(trimmedValue);

      // Success haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Clear animation - subtle fade and scale
      inputOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(1, { duration: 200 }),
      );

      // Clear the input
      setValue("");

      // Keep focus on input for quick consecutive adds
      inputRef.current?.focus();
    } catch (error) {
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Failed to add item:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    value,
    isSubmitting,
    disabled,
    onAdd,
    buttonScale,
    inputOpacity,
    reduceMotion,
  ]);

  const handleButtonPressIn = () => {
    if (!disabled && value.trim()) {
      buttonScale.value = reduceMotion
        ? 1
        : withTiming(0.97, { duration: 100 });
    }
  };

  const handleButtonPressOut = () => {
    buttonScale.value = reduceMotion ? 1 : withTiming(1, { duration: 140 });
  };

  const handleKeyboardSubmit = () => {
    handleSubmit();
  };

  const isAddDisabled = disabled || !value.trim() || isSubmitting;

  return (
    <Animated.View
      className="absolute bottom-0 left-0 right-0 border-t border-separator bg-surface px-4 pb-8 pt-3"
      style={[
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        containerAnimatedStyle,
      ]}
    >
      <View className="flex-row items-center gap-3">
        {/* Input field */}
        <Animated.View style={[{ flex: 1 }, inputAnimatedStyle]}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            placeholder="Add an item..."
            placeholderTextColor={themeColors.secondaryInk}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleKeyboardSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
            editable={!disabled}
            className={`h-12 rounded-xl bg-surface px-4 text-base text-ink ${
              isFocused ? "border-2 border-coral" : "border border-separator"
            }`}
            accessibilityLabel="Add item input"
            accessibilityHint="Enter the name of an item to add to your list"
          />
        </Animated.View>

        {/* Add button */}
        <AnimatedPressable
          onPress={handleSubmit}
          onPressIn={handleButtonPressIn}
          onPressOut={handleButtonPressOut}
          disabled={isAddDisabled}
          style={buttonAnimatedStyle}
          className={`h-12 w-12 items-center justify-center rounded-full ${
            isAddDisabled ? "bg-warm-gray-300" : "bg-coral"
          }`}
          accessibilityLabel="Add item"
          accessibilityRole="button"
          accessibilityState={{ disabled: isAddDisabled }}
        >
          <Plus
            size={24}
            color={
              isAddDisabled ? themeColors.secondaryInk : themeColors.surface
            }
            strokeWidth={2.5}
          />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}
