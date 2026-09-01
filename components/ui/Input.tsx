import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";
import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
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
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    className,
    containerClassName,
    frameClassName,
    leadingAccessory,
    onFocus,
    onBlur,
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
  const reduceMotion = useReducedMotion();
  const errorId = `${useId()}-error`;
  const visualState = useSharedValue(error ? 2 : 0);

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
    shadowOpacity: interpolate(
      visualState.get(),
      [0, 1, 2],
      [0, 0.12, 0.08],
    ),
    shadowRadius: interpolate(visualState.get(), [0, 1, 2], [0, 6, 4]),
  }));

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
        <View className={cn(leadingAccessory && "flex-row items-center")}>
          {leadingAccessory}
          <TextInput
            ref={ref}
            {...props}
            className={cn(
              "rounded-2xl px-4 py-4 text-ink",
              leadingAccessory && "flex-1",
              !editable && "text-ink-secondary",
              className,
            )}
            style={[styles.input, style]}
            editable={editable}
            placeholderTextColor={placeholderTextColor}
            selectionColor={selectionColor}
            underlineColorAndroid="transparent"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityHint={accessibilityHint ?? error}
            accessibilityState={{
              ...accessibilityState,
              disabled: !editable,
            }}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
          />
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
    </View>
  );
});
