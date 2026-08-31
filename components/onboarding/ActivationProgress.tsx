import { ChevronLeft } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const PROGRESS_DURATION_MS = 260;
const PROGRESS_EASING = Easing.bezier(0.77, 0, 0.175, 1);
const TRACK_FILL = "#C94A4A";
const TRACK_HIGHLIGHT = "rgba(255, 255, 255, 0.34)";

interface ActivationProgressProps {
  current: number;
  total: number;
  onBack?: () => void;
}

export function ActivationProgress({
  current,
  total,
  onBack,
}: ActivationProgressProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const progress = safeCurrent / safeTotal;
  const progressLabel = `Step ${safeCurrent} of ${safeTotal}`;
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
    width: Math.max(trackWidth.get() * animatedProgress.get() - 16, 0),
  }));

  return (
    <View className="h-11 flex-row items-center">
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          className="-ml-3 mr-1 h-11 w-11 items-center justify-center rounded-full"
          accessibilityLabel="Go back one setup step"
          accessibilityRole="button"
        >
          <ChevronLeft size={28} strokeWidth={2.25} color="#1A1917" />
        </Pressable>
      )}
      <View
        className="h-5 flex-1 overflow-hidden rounded-full bg-warm-gray-200"
        onLayout={(event) => {
          trackWidth.set(event.nativeEvent.layout.width);
        }}
        accessibilityLabel="Setup progress"
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 1,
          max: safeTotal,
          now: safeCurrent,
          text: progressLabel,
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
              backgroundColor: TRACK_FILL,
            },
            fillStyle,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 8,
              top: 5,
              height: 5,
              borderRadius: 999,
              backgroundColor: TRACK_HIGHLIGHT,
            },
            highlightStyle,
          ]}
        />
      </View>
    </View>
  );
}
