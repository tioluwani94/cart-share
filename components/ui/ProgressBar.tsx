import { themeColors } from "@/lib/theme";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const PROGRESS_DURATION_MS = 260;
const PROGRESS_EASING = Easing.bezier(0.77, 0, 0.175, 1);
const TRACK_HIGHLIGHT = "rgba(255, 255, 255, 0.34)";

const SIZE_METRICS = {
  regular: {
    height: 20,
    highlightHeight: 5,
    highlightInset: 8,
    highlightTop: 5,
  },
  compact: {
    height: 8,
    highlightHeight: 2,
    highlightInset: 4,
    highlightTop: 2,
  },
} as const;

export type ProgressBarSize = keyof typeof SIZE_METRICS;

interface ProgressBarProps {
  value: number;
  max: number;
  min?: number;
  size?: ProgressBarSize;
  accessibilityLabel: string;
  accessibilityText?: string;
}

export function ProgressBar({
  value,
  max,
  min = 0,
  size = "regular",
  accessibilityLabel,
  accessibilityText,
}: ProgressBarProps) {
  const metrics = SIZE_METRICS[size];
  const safeMin = Math.max(0, min);
  const safeMax = Math.max(safeMin, max);
  const safeValue = Math.min(Math.max(safeMin, value), safeMax);
  const progress = safeMax > 0 ? safeValue / safeMax : 0;
  const reduceMotion = useReducedMotion();
  const trackWidth = useSharedValue(0);
  const animatedProgress = useSharedValue(progress);

  useEffect(() => {
    animatedProgress.set(
      reduceMotion
        ? progress
        : withTiming(progress, {
            duration: PROGRESS_DURATION_MS,
            easing: PROGRESS_EASING,
          }),
    );
  }, [animatedProgress, progress, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth.get() * animatedProgress.get(),
  }));
  const highlightStyle = useAnimatedStyle(() => ({
    width: Math.max(
      trackWidth.get() * animatedProgress.get() -
        metrics.highlightInset * 2,
      0,
    ),
  }));

  return (
    <View
      className="flex-1 overflow-hidden rounded-full bg-warm-gray-200"
      style={{ height: metrics.height }}
      onLayout={(event) => {
        trackWidth.set(event.nativeEvent.layout.width);
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: safeMin,
        max: safeMax,
        now: safeValue,
        ...(accessibilityText ? { text: accessibilityText } : {}),
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            top: 0,
            borderRadius: 999,
            backgroundColor: themeColors.coral,
          },
          fillStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: metrics.highlightInset,
            top: metrics.highlightTop,
            height: metrics.highlightHeight,
            borderRadius: 999,
            backgroundColor: TRACK_HIGHLIGHT,
          },
          highlightStyle,
        ]}
      />
    </View>
  );
}
