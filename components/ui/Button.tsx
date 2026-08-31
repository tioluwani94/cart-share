import { Pressable, Text, ActivityIndicator } from "react-native";
import Animated, {
  Easing,
  useReducedMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type ButtonVariant = "primary" | "secondary" | "tonal" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  className?: string;
  textClassName?: string;
  accessibilityLabel?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-coral active:bg-coral/90",
  secondary: "bg-teal active:bg-teal/90",
  tonal: "bg-coral-soft active:bg-coral-soft/70",
  outline: "border border-coral bg-transparent",
  ghost: "bg-transparent",
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-white",
  tonal: "text-coral",
  outline: "text-coral",
  ghost: "text-coral",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[48px] px-4",
  md: "min-h-[48px] px-6",
  lg: "min-h-[52px] px-8",
};

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
  onPress,
  className,
  textClassName,
  accessibilityLabel,
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const handlePressIn = () => {
    if (!reduceMotion) {
      scale.set(
        withTiming(0.97, { duration: 120, easing: PRESS_EASE_OUT }),
      );
    }
  };

  const handlePressOut = () => {
    scale.set(
      reduceMotion
        ? 1
        : withTiming(1, { duration: 120, easing: PRESS_EASE_OUT }),
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
      style={animatedStyle}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      className={cn(
        "flex-row items-center justify-center rounded-full",
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "secondary"
              ? themeColors.surface
              : themeColors.coral
          }
          size="small"
        />
      ) : typeof children === "string" ? (
        <Text
          className={cn(
            "font-semibold",
            variantTextStyles[variant],
            sizeTextStyles[size],
            textClassName,
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
