import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useMemo } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { getButtonLayout, type ButtonSize } from "@/lib/buttonLayout";
import {
  getButtonMaterial,
  type ButtonVariant,
} from "@/lib/buttonMaterial";
import { useIsOnGlassSurface } from "./GlassSurfaceContext";
import { useReduceTransparency } from "./useReduceTransparency";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
  onPress?: () => void;
  className?: string;
  textClassName?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  iconOnly = false,
  onPress,
  className,
  textClassName,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const reduceTransparency = useReduceTransparency();
  const onGlassSurface = useIsOnGlassSurface();
  const nativeGlassAvailable =
    Platform.OS === "ios" &&
    !reduceTransparency &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();
  const scale = useSharedValue(1);
  const pressOverlayOpacity = useSharedValue(0);
  const layout = useMemo(
    () => getButtonLayout({ size, iconOnly }),
    [iconOnly, size],
  );
  const material = useMemo(
    () =>
      getButtonMaterial({
        variant,
        reduceTransparency: reduceTransparency || Platform.OS !== "ios",
        onGlassSurface,
        nativeGlassAvailable,
      }),
    [nativeGlassAvailable, onGlassSurface, reduceTransparency, variant],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));
  const animatedPressOverlayStyle = useAnimatedStyle(() => ({
    opacity: pressOverlayOpacity.get(),
  }));

  const handlePressIn = () => {
    pressOverlayOpacity.set(
      withTiming(1, { duration: 80, easing: PRESS_EASE_OUT }),
    );
    if (!reduceMotion) {
      scale.set(
        withSpring(0.97, {
          damping: 28,
          stiffness: 520,
          mass: 0.7,
          overshootClamping: true,
          energyThreshold: 6e-9,
        }),
      );
    }
  };

  const handlePressOut = () => {
    pressOverlayOpacity.set(
      withTiming(0, { duration: 120, easing: PRESS_EASE_OUT }),
    );
    scale.set(
      reduceMotion
        ? 1
        : withSpring(1, {
            damping: 28,
            stiffness: 520,
            mass: 0.7,
            overshootClamping: true,
            energyThreshold: 6e-9,
          }),
    );
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      pressRetentionOffset={16}
      style={[animatedStyle, layout.fixedStyle]}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      className={cn(
        "relative flex-row items-center justify-center overflow-hidden rounded-full",
        material.containerClassName,
        layout.containerClassName,
        className,
      )}
    >
      {material.nativeGlass ? (
        <GlassView
          key={isDisabled ? "disabled-glass" : "interactive-glass"}
          glassEffectStyle={material.nativeGlass.effect}
          tintColor={material.nativeGlass.tintColor}
          isInteractive={!isDisabled}
          colorScheme="light"
          style={{ position: "absolute", inset: 0, borderRadius: 999 }}
        />
      ) : material.blurIntensity > 0 ? (
        <BlurView
          pointerEvents="none"
          tint={material.blurTint}
          intensity={material.blurIntensity}
          style={{ position: "absolute", inset: 0 }}
        />
      ) : null}
      {material.highlightColor !== "transparent" ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: material.highlightColor,
          }}
        />
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(26, 25, 23, 0.1)",
          },
          animatedPressOverlayStyle,
        ]}
      />
      {loading ? (
        <ActivityIndicator
          color={material.spinnerColor}
          size="small"
        />
      ) : typeof children === "string" ? (
        <Text
          className={cn(
            "font-semibold",
            material.textClassName,
            sizeTextStyles[size],
            textClassName,
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
      {isDisabled ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(250, 250, 250, 0.52)",
          }}
        />
      ) : null}
    </AnimatedPressable>
  );
}
