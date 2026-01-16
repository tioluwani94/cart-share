import { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface FloatingIconProps {
  emoji: string;
  delay: number;
  initialY: number;
}

/**
 * Individual floating grocery icon with bounce animation
 */
function FloatingIcon({ emoji, delay, initialY }: FloatingIconProps) {
  const translateY = useSharedValue(initialY);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Entry animation with delay
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 100 })
    );

    // Continuous floating animation
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(initialY - 8, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(initialY + 8, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      )
    );

    // Subtle rotation
    rotate.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delay, initialY, translateY, scale, rotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text className="text-5xl">{emoji}</Text>
    </Animated.View>
  );
}

/**
 * Animated grocery icons display for the welcome screen.
 * Shows playful floating food emojis with staggered animations.
 */
export function AnimatedGroceryIcons() {
  const groceryItems = [
    { emoji: "🥑", delay: 0, initialY: 0 },
    { emoji: "🍎", delay: 100, initialY: 4 },
    { emoji: "🥕", delay: 200, initialY: -2 },
    { emoji: "🧀", delay: 300, initialY: 2 },
    { emoji: "🍞", delay: 400, initialY: -4 },
  ];

  return (
    <View className="flex-row items-center justify-center gap-4">
      {groceryItems.map((item, index) => (
        <FloatingIcon
          key={index}
          emoji={item.emoji}
          delay={item.delay}
          initialY={item.initialY}
        />
      ))}
    </View>
  );
}
