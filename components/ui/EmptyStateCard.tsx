import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useReducedMotion,
} from "react-native-reanimated";

import { Button } from "./Button";

export type EmptyStateCardVariant = "surface" | "embedded";
export type EmptyStateCardDensity = "regular" | "compact";

export interface EmptyStateCardProps {
  title: string;
  description: string;
  artworkSource?: number;
  icon?: ReactNode;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onAction?: () => void;
  variant?: EmptyStateCardVariant;
  density?: EmptyStateCardDensity;
  className?: string;
}

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const ENTER = FadeIn.duration(180).easing(EASE_OUT);
const REDUCED_ENTER = FadeIn.duration(120).easing(EASE_OUT);

/**
 * Shared persistent empty-state treatment.
 *
 * The default surface is intentionally opaque: glass is reserved for floating
 * functional chrome, while an empty state belongs to the page's content layer.
 */
export function EmptyStateCard({
  title,
  description,
  artworkSource,
  icon,
  actionLabel,
  actionAccessibilityLabel,
  onAction,
  variant = "surface",
  density = "regular",
  className,
}: EmptyStateCardProps) {
  const reduceMotion = useReducedMotion();
  const compact = density === "compact";

  return (
    <Animated.View
      entering={reduceMotion ? REDUCED_ENTER : ENTER}
      testID="empty-state-card"
      style={
        variant === "surface"
          ? { backgroundColor: themeColors.surface }
          : undefined
      }
      className={cn(
        "items-center",
        variant === "surface" &&
          "rounded-3xl border border-separator bg-surface px-6 py-8",
        variant === "embedded" && (compact ? "px-4 py-6" : "px-6 py-10"),
        className,
      )}
    >
      {artworkSource ? (
        <Image
          source={artworkSource}
          contentFit="contain"
          transition={reduceMotion ? 0 : 100}
          style={{
            width: compact ? 72 : 104,
            height: compact ? 72 : 104,
          }}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      ) : icon ? (
        <View
          className={cn(
            "items-center justify-center rounded-2xl bg-coral-soft",
            compact ? "h-14 w-14" : "h-16 w-16",
          )}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {icon}
        </View>
      ) : null}

      <Text
        className={cn(
          "text-center font-heading tracking-tight text-ink",
          artworkSource || icon ? (compact ? "mt-3" : "mt-5") : "",
          compact ? "text-lg leading-6" : "text-2xl leading-8",
        )}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <Text
        className={cn(
          "mt-2 max-w-sm text-center text-ink-secondary",
          compact ? "text-sm leading-5" : "text-base leading-6",
        )}
      >
        {description}
      </Text>

      {actionLabel && onAction ? (
        <Button
          onPress={onAction}
          className="mt-6 w-full"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Animated.View>
  );
}
