import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  cubicBezier,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { useReduceTransparency } from "./useReduceTransparency";

const CONTROL_INSET = 4;
const SELECTION_DURATION_MS = 180;
const SELECTION_EASING = Easing.bezier(0.77, 0, 0.175, 1);
const PRESS_DURATION_MS = "120ms";
const PRESS_EASING = cubicBezier(0.23, 1, 0.32, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface GlassSegmentedControlOption<Value extends string> {
  label: string;
  value: Value;
  accessibilityLabel?: string;
}

export interface GlassSegmentedControlProps<Value extends string> {
  value: Value;
  options: readonly GlassSegmentedControlOption<Value>[];
  onValueChange: (value: Value) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  className?: string;
}

interface SegmentButtonProps {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}

function SegmentButton({
  label,
  accessibilityLabel,
  selected,
  disabled,
  reduceMotion,
  onPress,
}: SegmentButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      pressRetentionOffset={16}
      className="min-h-11 flex-1 items-center justify-center rounded-full px-3"
      style={{
        opacity: pressed ? 0.68 : 1,
        transform: [
          { scale: pressed && !reduceMotion ? 0.97 : 1 },
        ],
        transitionProperty: reduceMotion
          ? "opacity"
          : ["opacity", "transform"],
        transitionDuration: PRESS_DURATION_MS,
        transitionTimingFunction: PRESS_EASING,
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <Text
        className={cn(
          "text-center font-semibold",
          selected ? "text-ink" : "text-ink-secondary",
        )}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/**
 * A single-layer glass segmented control with an anchored, sliding selection.
 * Equal-width segments keep the indicator transform-only and cheap to animate.
 */
export function GlassSegmentedControl<Value extends string>({
  value,
  options,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  className,
}: GlassSegmentedControlProps<Value>) {
  const reduceMotion = useReducedMotion();
  const reduceTransparency = useReduceTransparency();
  const indicatorX = useSharedValue(0);
  const hasPositionedIndicator = useRef(false);
  const [controlWidth, setControlWidth] = useState(0);
  const nativeGlassAvailable =
    Platform.OS === "ios" &&
    !reduceTransparency &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();
  const usesBlurFallback =
    Platform.OS === "ios" && !reduceTransparency && !nativeGlassAvailable;
  const selectedIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.value === value)),
    [options, value],
  );
  const segmentWidth =
    options.length > 0
      ? Math.max(0, controlWidth - CONTROL_INSET * 2) / options.length
      : 0;

  useEffect(() => {
    if (segmentWidth <= 0) return;

    const targetX = selectedIndex * segmentWidth;
    if (!hasPositionedIndicator.current || reduceMotion) {
      indicatorX.set(targetX);
      hasPositionedIndicator.current = true;
      return;
    }

    indicatorX.set(
      withTiming(targetX, {
        duration: SELECTION_DURATION_MS,
        easing: SELECTION_EASING,
      }),
    );
  }, [indicatorX, reduceMotion, segmentWidth, selectedIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
  }));

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setControlWidth((currentWidth) =>
      Math.abs(currentWidth - nextWidth) > 0.5 ? nextWidth : currentWidth,
    );
  }, []);

  const select = useCallback(
    (nextValue: Value) => {
      if (disabled || nextValue === value) return;
      void Haptics.selectionAsync();
      onValueChange(nextValue);
    },
    [disabled, onValueChange, value],
  );

  if (options.length === 0) return null;

  return (
    <View
      className={cn("rounded-full", disabled && "opacity-60", className)}
      style={{
        shadowColor: "#1A1917",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: reduceTransparency ? 0 : 0.08,
        shadowRadius: 10,
        elevation: reduceTransparency ? 0 : 2,
      }}
    >
      <View
        onLayout={handleLayout}
        accessibilityLabel={accessibilityLabel}
        className={cn(
          "relative flex-row overflow-hidden rounded-full border p-1",
          reduceTransparency
            ? "border-separator bg-warm-gray-100"
            : "border-white/80 bg-white/30",
        )}
      >
        {nativeGlassAvailable ? (
          <GlassView
            pointerEvents="none"
            glassEffectStyle="regular"
            tintColor="rgba(255, 255, 255, 0.2)"
            colorScheme="light"
            style={{ position: "absolute", inset: 0, borderRadius: 999 }}
          />
        ) : usesBlurFallback ? (
          <BlurView
            pointerEvents="none"
            tint="systemThinMaterialLight"
            intensity={46}
            style={{ position: "absolute", inset: 0 }}
          />
        ) : null}

        {!reduceTransparency ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          />
        ) : null}

        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            className="absolute bottom-1 left-1 top-1 rounded-full border border-white/90 bg-white/80"
            style={[
              {
                width: segmentWidth,
                shadowColor: "#1A1917",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: reduceTransparency ? 0 : 0.12,
                shadowRadius: 4,
                elevation: reduceTransparency ? 0 : 1,
              },
              indicatorStyle,
            ]}
          />
        ) : null}

        {options.map((option) => {
          const selected = option.value === value;
          return (
            <SegmentButton
              key={option.value}
              label={option.label}
              accessibilityLabel={option.accessibilityLabel ?? option.label}
              selected={selected}
              disabled={disabled}
              reduceMotion={reduceMotion}
              onPress={() => select(option.value)}
            />
          );
        })}
      </View>
    </View>
  );
}
