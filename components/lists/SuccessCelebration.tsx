import { useEffect } from "react";
import { Text, View } from "react-native";
import { CircleCheck } from "lucide-react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { themeColors } from "@/lib/theme";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const CONTENT_ENTER_MS = 220;

/**
 * Success celebration overlay.
 */
export function SuccessCelebration({ listName }: { listName: string }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : 10);
  const badgeScale = useSharedValue(reduceMotion ? 1 : 0.94);

  useEffect(() => {
    opacity.set(
      withTiming(1, {
        duration: reduceMotion ? 120 : CONTENT_ENTER_MS,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.System,
      }),
    );
    if (!reduceMotion) {
      translateY.set(
        withTiming(0, {
          duration: CONTENT_ENTER_MS,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        }),
      );
      badgeScale.set(
        withDelay(
          40,
          withSpring(1, {
            duration: 400,
            dampingRatio: 1,
            reduceMotion: ReduceMotion.System,
          }),
        ),
      );
    }
  }, [badgeScale, opacity, reduceMotion, translateY]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.get() }],
  }));

  return (
    <View
      className="flex-1 items-center justify-center py-12"
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`List created. ${listName} is ready.`}
    >
      <Animated.View
        style={containerStyle}
        className="w-full items-center justify-center"
      >
        <Animated.View
          style={badgeStyle}
          className="h-24 w-24 items-center justify-center rounded-3xl bg-teal-soft"
          accessible={false}
        >
          <CircleCheck
            size={48}
            color={themeColors.teal}
            strokeWidth={2.25}
          />
        </Animated.View>

        <Text
          className="mt-6 text-center text-2xl font-heading leading-8 text-ink"
          accessibilityRole="header"
        >
          List created
        </Text>

        <Text
          className="mt-2 max-w-xs text-center text-base leading-6 text-ink-secondary"
          numberOfLines={3}
        >
          {listName} is ready. Add the first item or share it with your
          household.
        </Text>
      </Animated.View>
    </View>
  );
}
