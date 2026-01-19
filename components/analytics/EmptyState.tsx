import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export const AnalyticsEmptyState = () => {
  return (
    <View className="flex-1 items-center justify-center px-4 pt-16">
      <Animated.View entering={FadeInDown.delay(200).springify().damping(90)}>
        <EmptyStateIllustration />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(400).springify()}
        className="mt-8 items-center"
      >
        <Text className="text-center text-xl font-semibold text-warm-gray-800">
          No spending data yet
        </Text>
        <Text className="mt-3 text-center text-base text-warm-gray-500 px-8">
          Scan your first receipt to unlock insights!
        </Text>
      </Animated.View>

      {/* Encouraging tip */}
      <Animated.View
        entering={FadeInUp.delay(600).springify()}
        className="mt-8 rounded-2xl bg-coral/5 px-6 py-4 mx-4"
      >
        <Text className="text-center text-sm text-warm-gray-600">
          💡 After completing a shopping list, tap the camera icon to scan your
          receipt and track your spending.
        </Text>
      </Animated.View>
    </View>
  );
};

/**
 * Animated receipt/chart illustration for empty state.
 */
function EmptyStateIllustration() {
  // Floating animation for the chart emoji
  const floatValue = useSharedValue(0);

  // Start floating animation
  floatValue.value = withRepeat(
    withSequence(
      withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
    ),
    -1,
    true,
  );

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatValue.value }],
  }));

  // Sparkle animation
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);

  sparkle1.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 800 }),
      withTiming(0.3, { duration: 800 }),
    ),
    -1,
    true,
  );

  sparkle2.value = withDelay(
    400,
    withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      true,
    ),
  );

  const sparkle1Style = useAnimatedStyle(() => ({
    opacity: sparkle1.value,
    transform: [{ scale: sparkle1.value }],
  }));

  const sparkle2Style = useAnimatedStyle(() => ({
    opacity: sparkle2.value,
    transform: [{ scale: sparkle2.value }],
  }));

  return (
    <View className="items-center justify-center">
      <View className="relative">
        <Animated.Text style={floatingStyle} className="text-8xl">
          📊
        </Animated.Text>
        {/* Sparkles */}
        <Animated.Text
          style={[
            sparkle1Style,
            { position: "absolute", top: -10, right: -15 },
          ]}
          className="text-2xl"
        >
          ✨
        </Animated.Text>
        <Animated.Text
          style={[
            sparkle2Style,
            { position: "absolute", bottom: 10, left: -20 },
          ]}
          className="text-xl"
        >
          💫
        </Animated.Text>
      </View>
      {/* Supporting emojis */}
      <View className="flex-row mt-2 gap-3">
        <Text className="text-3xl opacity-60">🧾</Text>
        <Text className="text-3xl opacity-60">📈</Text>
        <Text className="text-3xl opacity-60">💰</Text>
      </View>
    </View>
  );
}
