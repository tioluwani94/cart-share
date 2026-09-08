import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";
import { forwardRef, useEffect, useId, useState, type ReactNode } from "react";
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  useSheetInputFocusRequester,
  useSheetTextInput,
} from "./SheetTextInputContext";

const STATE_TRANSITION_MS = 150;
const STATE_EASING = Easing.bezier(0.23, 1, 0.32, 1);

const styles = StyleSheet.create({
  fieldFrame: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    minHeight: 56,
    fontSize: 17,
    lineHeight: 22,
  },
});

export interface InputProps extends Omit<TextInputProps, "className"> {
  label: string;
  error?: string;
  className?: string;
  containerClassName?: string;
  frameClassName?: string;
  leadingAccessory?: ReactNode;
  trailingAccessory?: ReactNode;
}

type AccessibleTextInputProps = TextInputProps & {
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    className,
    containerClassName,
    frameClassName,
    leadingAccessory,
    trailingAccessory,
    onFocus,
    onBlur,
    onSubmitEditing,
    multiline = false,
    returnKeyType,
    submitBehavior,
    inputAccessoryViewID,
    accessibilityHint,
    accessibilityLabel,
    accessibilityState,
    editable = true,
    placeholderTextColor = themeColors.muted,
    selectionColor = themeColors.coral,
    style,
    ...props
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const SheetTextInput = useSheetTextInput();
  const requestSheetInputFocus = useSheetInputFocusRequester();
  const reduceMotion = useReducedMotion();
  const fieldId = useId().replace(/:/g, "");
  const errorId = `${fieldId}-error`;
  const keyboardAccessoryId = `${fieldId}-keyboard-actions`;
  const visualState = useSharedValue(error ? 2 : 0);
  const resolvedReturnKeyType =
    returnKeyType ?? (multiline ? "default" : "done");
  const resolvedSubmitBehavior =
    submitBehavior ?? (multiline ? "newline" : "blurAndSubmit");
  const ownsMultilineDoneAccessory =
    Platform.OS === "ios" && multiline && !inputAccessoryViewID;

  useEffect(() => {
    const target = error ? 2 : isFocused ? 1 : 0;
    visualState.set(
      reduceMotion
        ? target
        : withTiming(target, {
            duration: STATE_TRANSITION_MS,
            easing: STATE_EASING,
          }),
    );
  }, [error, isFocused, reduceMotion, visualState]);

  const frameStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      visualState.get(),
      [0, 1, 2],
      [themeColors.separator, themeColors.coral, themeColors.error],
    ),
    shadowColor: interpolateColor(
      visualState.get(),
      [0, 1, 2],
      [themeColors.separator, themeColors.coral, themeColors.error],
    ),
    shadowOpacity: interpolate(visualState.get(), [0, 1, 2], [0, 0.12, 0.08]),
    shadowRadius: interpolate(visualState.get(), [0, 1, 2], [0, 6, 4]),
  }));

  const inputProps: AccessibleTextInputProps = {
    ...props,
    className: cn(
      "rounded-2xl px-4 py-4 text-ink",
      (leadingAccessory || trailingAccessory) && "min-w-0 flex-1",
      !editable && "text-ink-secondary",
      className,
    ),
    style: [styles.input, style],
    multiline,
    returnKeyType: resolvedReturnKeyType,
    submitBehavior: resolvedSubmitBehavior,
    inputAccessoryViewID:
      inputAccessoryViewID ??
      (ownsMultilineDoneAccessory ? keyboardAccessoryId : undefined),
    editable,
    placeholderTextColor,
    selectionColor,
    underlineColorAndroid: "transparent",
    accessibilityLabel: accessibilityLabel ?? label,
    accessibilityHint: accessibilityHint ?? error,
    accessibilityState: {
      ...accessibilityState,
      disabled: !editable,
    },
    "aria-describedby": error ? errorId : undefined,
    "aria-invalid": Boolean(error),
    onFocus: (event) => {
      setIsFocused(true);
      requestSheetInputFocus?.(event.nativeEvent.target);
      onFocus?.(event);
    },
    onBlur: (event) => {
      setIsFocused(false);
      onBlur?.(event);
    },
    onSubmitEditing: (event) => {
      onSubmitEditing?.(event);
      if (resolvedSubmitBehavior !== "newline") {
        Keyboard.dismiss();
      }
    },
  };

  return (
    <View className={cn("mb-4", containerClassName)}>
      <Text className="mb-2 text-[15px] font-semibold leading-5 text-ink">
        {label}
      </Text>
      <Animated.View
        className={cn(
          "rounded-2xl bg-surface",
          !editable && "bg-warm-gray-100",
          frameClassName,
        )}
        style={[styles.fieldFrame, frameStyle]}
      >
        <View
          className={cn(
            (leadingAccessory || trailingAccessory) && "flex-row items-center",
          )}
        >
          {leadingAccessory}
          {SheetTextInput ? (
            <SheetTextInput ref={ref} {...inputProps} />
          ) : (
            <TextInput ref={ref} {...inputProps} />
          )}
          {trailingAccessory}
        </View>
      </Animated.View>
      {error && (
        <Text
          nativeID={errorId}
          className="mt-2 text-sm leading-5"
          style={{ color: themeColors.error }}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
      {ownsMultilineDoneAccessory && (
        <InputAccessoryView nativeID={keyboardAccessoryId}>
          <View className="flex-row justify-end border-t border-separator bg-surface px-3 py-1">
            <Pressable
              onPress={Keyboard.dismiss}
              className="min-h-11 min-w-16 items-center justify-center rounded-xl px-3 active:bg-warm-gray-100"
              accessibilityRole="button"
              accessibilityLabel={`Done editing ${label}`}
            >
              <Text className="text-[17px] font-semibold text-coral">Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
});
