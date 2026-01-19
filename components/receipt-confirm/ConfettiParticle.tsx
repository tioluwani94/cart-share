import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export function ConfettiParticle({
  emoji,
  startX,
  delay,
}: {
  emoji: string;
  startX: number;
  delay: number;
}) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(600, {
        duration: 2500,
        easing: Easing.out(Easing.quad),
      });
      translateX.value = withSequence(
        withTiming((Math.random() - 0.5) * 100, { duration: 800 }),
        withTiming((Math.random() - 0.5) * 150, { duration: 1700 }),
      );
      rotation.value = withTiming((Math.random() - 0.5) * 720, {
        duration: 2500,
      });
      // Fade out near end
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 });
      }, 2000);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, opacity, rotation, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        animatedStyle,
        {
          position: "absolute",
          left: `${startX}%`,
          top: 100,
          fontSize: 24,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}
