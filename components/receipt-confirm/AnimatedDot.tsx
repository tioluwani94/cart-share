import { themeColors } from "@/lib/theme";
import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function AnimatedDot({ delay }: { delay: number }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    if (reduceMotion) {
      opacity.set(0.65);
      return;
    }

    opacity.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: 360,
              easing: Easing.inOut(Easing.ease),
              reduceMotion: ReduceMotion.System,
            }),
            withTiming(0.35, {
              duration: 360,
              easing: Easing.inOut(Easing.ease),
              reduceMotion: ReduceMotion.System,
            }),
          ),
          -1,
          false,
        ),
      ),
    );

    return () => cancelAnimation(opacity);
  }, [delay, opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          marginLeft: delay > 0 ? 7 : 0,
          height: 8,
          width: 8,
          borderRadius: 9999,
          backgroundColor: themeColors.teal,
        },
      ]}
    />
  );
}
