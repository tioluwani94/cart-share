import { useState, useCallback, useRef } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AddItemInputProps {
  onAdd: (name: string) => Promise<void>;
  disabled?: boolean;
}

export function AddItemInput({ onAdd, disabled = false }: AddItemInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const buttonScale = useSharedValue(1);
  const inputWidth = useSharedValue(1);
  const inputOpacity = useSharedValue(1);

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
    buttonScale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );

    try {
      await onAdd(trimmedValue);

      // Success haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Clear animation - subtle fade and scale
      inputOpacity.value = withSequence(
        withTiming(0.3, { duration: 100 }),
        withTiming(1, { duration: 200 })
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
  }, [value, isSubmitting, disabled, onAdd, buttonScale, inputOpacity]);

  const handleButtonPressIn = () => {
    if (!disabled && value.trim()) {
      buttonScale.value = withSpring(0.9, { damping: 10, stiffness: 400 });
    }
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 400 });
  };

  const handleKeyboardSubmit = () => {
    handleSubmit();
  };

  const isAddDisabled = disabled || !value.trim() || isSubmitting;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-warm-gray-100 bg-white px-4 pb-8 pt-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View className="flex-row items-center gap-3">
        {/* Input field */}
        <Animated.View style={[{ flex: 1 }, inputAnimatedStyle]}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            placeholder="Add an item..."
            placeholderTextColor="#9CA3AF"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleKeyboardSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
            editable={!disabled}
            className={`h-12 rounded-2xl bg-warm-gray-50 px-4 text-base text-warm-gray-800 ${
              isFocused ? "border-2 border-teal" : "border border-warm-gray-200"
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
          className={`h-12 w-12 items-center justify-center rounded-2xl ${
            isAddDisabled ? "bg-warm-gray-300" : "bg-coral"
          }`}
          accessibilityLabel="Add item"
          accessibilityRole="button"
          accessibilityState={{ disabled: isAddDisabled }}
        >
          <Plus
            size={24}
            color={isAddDisabled ? "#78716C" : "#FFFFFF"}
            strokeWidth={2.5}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
}
