import { formatAmount } from "@/lib/formatAmount";
import { TrendingUp } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/**
 * Large animated total display.
 */
export function TotalDisplay({
  amount,
  sessionCount,
}: {
  amount: number;
  sessionCount: number;
}) {
  // Scale animation for the total on mount
  const scaleValue = useSharedValue(0.8);

  scaleValue.value = withSequence(
    withTiming(1.05, { duration: 300, easing: Easing.out(Easing.ease) }),
    withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) }),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  return (
    <Animated.View
      entering={FadeInUp.delay(200).springify()}
      style={animatedStyle}
      className="items-center py-6"
    >
      {/* Large total */}
      <Text className="text-5xl font-bold text-coral">
        {formatAmount(amount)}
      </Text>
      <Text className="mt-2 text-lg text-warm-gray-600">this {monthName}</Text>

      {/* Session count badge */}
      {sessionCount > 0 && (
        <View className="mt-4 flex-row items-center rounded-full bg-teal/10 px-4 py-2">
          <TrendingUp size={16} color="#4ECDC4" strokeWidth={2} />
          <Text className="ml-2 text-sm font-medium text-teal">
            {sessionCount} shopping trip{sessionCount === 1 ? "" : "s"}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
