import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Button } from "@/components/ui";

interface EmptyListStateProps {
  onCreateList: () => void;
}

/**
 * Delightful empty state for when user has no lists.
 * Features animated illustrations and a pulsing CTA button.
 */
export function EmptyListState({ onCreateList }: EmptyListStateProps) {
  // Avocado wave animation
  const avocadoRotation = useSharedValue(0);
  const avocadoScale = useSharedValue(1);

  // Cart bounce animation
  const cartTranslateY = useSharedValue(0);

  // CTA button pulse animation
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Avocado waving animation (tilts back and forth)
    avocadoRotation.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withDelay(1000, withTiming(0, { duration: 0 })) // Pause between waves
      ),
      -1, // Repeat infinitely
      false
    );

    // Subtle scale breathing for avocado
    avocadoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Cart gentle bounce
    cartTranslateY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // CTA button gentle pulse
    buttonScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const avocadoStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${avocadoRotation.value}deg` },
      { scale: avocadoScale.value },
    ],
  }));

  const cartStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cartTranslateY.value }],
  }));

  const buttonContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center px-8 pt-12">
      {/* Animated illustration */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(600).springify()}
        className="mb-6 flex-row items-end justify-center"
      >
        {/* Shopping cart */}
        <Animated.View style={cartStyle}>
          <Text className="text-7xl">🛒</Text>
        </Animated.View>

        {/* Waving avocado */}
        <Animated.View style={avocadoStyle} className="-ml-2 -mb-2">
          <Text className="text-5xl">🥑</Text>
        </Animated.View>
      </Animated.View>

      {/* Playful heading */}
      <Animated.View entering={FadeIn.delay(300).duration(500)}>
        <Text className="text-center text-2xl font-bold text-warm-gray-900">
          Your lists are feeling lonely!
        </Text>
      </Animated.View>

      {/* Encouraging subtext */}
      <Animated.View entering={FadeIn.delay(400).duration(500)}>
        <Text className="mt-3 text-center text-base text-warm-gray-500">
          Time to start shopping! Create your first list{"\n"}and invite your
          partner to join the fun.
        </Text>
      </Animated.View>

      {/* CTA Button with pulse animation */}
      <Animated.View
        entering={FadeInUp.delay(500).duration(500).springify()}
        style={buttonContainerStyle}
        className="mt-8 w-full"
      >
        <Button
          onPress={onCreateList}
          variant="primary"
          size="lg"
          accessibilityLabel="Create your first shopping list"
        >
          Create your first list
        </Button>
      </Animated.View>

      {/* Decorative floating emojis */}
      <Animated.View
        entering={FadeIn.delay(700).duration(800)}
        className="absolute bottom-0 w-full flex-row justify-around opacity-10"
      >
        <Text className="text-4xl">🍎</Text>
        <Text className="text-4xl">🥕</Text>
        <Text className="text-4xl">🧀</Text>
        <Text className="text-4xl">🥦</Text>
        <Text className="text-4xl">🍞</Text>
      </Animated.View>
    </View>
  );
}
