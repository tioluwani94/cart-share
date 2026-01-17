import { useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
}

/**
 * OTP-style code input with large, spaced character boxes.
 * Used for entering invite codes.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error = false,
}: CodeInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Animation for error shake
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Trigger shake animation when error changes to true
  useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withSpring(-10, { damping: 8, stiffness: 400 }),
        withSpring(10, { damping: 8, stiffness: 400 }),
        withSpring(-8, { damping: 8, stiffness: 400 }),
        withSpring(8, { damping: 8, stiffness: 400 }),
        withSpring(0, { damping: 8, stiffness: 400 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [error]);

  const handleChange = (text: string, index: number) => {
    // Only allow alphanumeric characters
    const cleanText = text.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (cleanText.length === 0) {
      // Backspace was pressed
      const newValue = value.slice(0, index) + value.slice(index + 1);
      onChange(newValue);
      return;
    }

    // Handle paste (multiple characters)
    if (cleanText.length > 1) {
      const pastedValue = cleanText.slice(0, length);
      onChange(pastedValue);
      // Focus last filled input or last input
      const focusIndex = Math.min(pastedValue.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    // Single character typed
    const newValue =
      value.slice(0, index) + cleanText + value.slice(index + 1);
    onChange(newValue.slice(0, length));

    // Move to next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!value[index] && index > 0) {
        // Current box empty, move to previous and clear it
        inputRefs.current[index - 1]?.focus();
        const newValue = value.slice(0, index - 1) + value.slice(index);
        onChange(newValue);
      }
    }
  };

  const handleFocus = (index: number) => {
    // Light haptic on focus
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  return (
    <Animated.View
      style={shakeStyle}
      className="flex-row justify-center gap-2"
      accessibilityLabel={`Invite code input, ${value.length} of ${length} characters entered`}
      accessibilityRole="none"
    >
      {Array.from({ length }).map((_, index) => {
        const char = value[index] || "";
        const isFilled = !!char;
        const isFocused = false; // We'll track this in state if needed

        return (
          <Pressable
            key={index}
            onPress={() => focusInput(index)}
            accessibilityLabel={`Character ${index + 1} of ${length}${char ? `, ${char}` : ", empty"}`}
          >
            <View
              className={`h-14 w-11 items-center justify-center rounded-xl border-2 ${
                error
                  ? "border-coral bg-coral/5"
                  : isFilled
                    ? "border-teal bg-teal/5"
                    : "border-warm-gray-200 bg-white"
              }`}
            >
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                value={char}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => handleFocus(index)}
                maxLength={1}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="default"
                textContentType="oneTimeCode"
                className="text-center text-2xl font-bold text-warm-gray-900"
                style={{ width: "100%", height: "100%" }}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}
