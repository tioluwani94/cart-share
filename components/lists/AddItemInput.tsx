import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Keyboard, TextInput, View } from "react-native";
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { themeColors } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

interface AddItemInputProps {
  onAdd: (name: string) => Promise<void>;
  disabled?: boolean;
  /** Keeps the composer above persistent navigation chrome. */
  bottomOffset?: number;
  /** Renders the composer as part of the shared tab-bar footer dock. */
  variant?: "standalone" | "docked";
  /** Resting distance from the screen bottom when docked. */
  keyboardOffset?: number;
}

export function AddItemInput({
  onAdd,
  disabled = false,
  bottomOffset = 0,
  variant = "standalone",
  keyboardOffset = 0,
}: AddItemInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Animation values
  const inputOpacity = useSharedValue(1);

  // Keyboard animation
  const keyboard = useAnimatedKeyboard();

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          keyboard.height.value > 0
            ? -Math.max(
                0,
                keyboard.height.value -
                  (variant === "docked" ? keyboardOffset : bottomOffset),
              )
            : 0,
      },
    ],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
  }));

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    const trimmedValue = value.trim();
    if (!trimmedValue || isSubmitting || disabled) return;

    setIsSubmitting(true);

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
    inputOpacity,
  ]);

  const handleKeyboardSubmit = () => {
    void handleSubmit();
  };

  const isAddDisabled = disabled || !value.trim() || isSubmitting;

  return (
    <Animated.View
      className={
        variant === "docked"
          ? "h-full bg-surface px-4 py-3"
          : "absolute left-0 right-0 border-t border-separator bg-surface px-4 pt-3"
      }
      style={[
        variant === "standalone"
          ? {
              bottom: bottomOffset,
              paddingBottom: bottomOffset > 0 ? 12 : 32,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 8,
            }
          : undefined,
        containerAnimatedStyle,
      ]}
    >
      <View className="flex-row items-center gap-3">
        {/* Input field */}
        <Animated.View style={[{ flex: 1 }, inputAnimatedStyle]}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Add an item..."
            placeholderTextColor={themeColors.secondaryInk}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleKeyboardSubmit}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            editable={!disabled}
            className={`h-12 rounded-xl bg-surface px-4 text-base text-ink ${
              isFocused ? "border-2 border-coral" : "border border-separator"
            }`}
            accessibilityLabel="Add item input"
            accessibilityHint="Enter the name of an item to add to your list"
          />
        </Animated.View>

        {/* Add button */}
        <Button
          onPress={() => void handleSubmit()}
          disabled={isAddDisabled}
          iconOnly
          size="sm"
          accessibilityLabel="Add item"
          accessibilityHint="Adds the entered item to this shopping list"
        >
          <Plus
            size={22}
            color={themeColors.surface}
            strokeWidth={2.5}
          />
        </Button>
      </View>
    </Animated.View>
  );
}
