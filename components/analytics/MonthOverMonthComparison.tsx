import { View, Text } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { TrendingDown, TrendingUp, Minus } from "lucide-react-native";
import { useEffect } from "react";

interface MonthlyData {
  month: number;
  year: number;
  label: string;
  totalCents: number;
  totalDollars: number;
  sessionCount: number;
}

interface MonthOverMonthComparisonProps {
  spendingHistory: MonthlyData[];
}

/**
 * Format cents to dollar string.
 */
function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/**
 * Calculate percentage change between two values.
 */
function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Month-over-month spending comparison card.
 * Shows whether the user spent more or less than last month.
 */
export function MonthOverMonthComparison({
  spendingHistory,
}: MonthOverMonthComparisonProps) {
  // Scale animation for the badge
  const badgeScale = useSharedValue(0.8);

  useEffect(() => {
    badgeScale.value = withDelay(300, withSpring(1, { damping: 12 }));
  }, []);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  // Get current month (last item) and previous month (second to last)
  // History is ordered oldest to newest, so index 5 is current, 4 is previous
  const currentMonthIndex = spendingHistory.length - 1;
  const previousMonthIndex = spendingHistory.length - 2;

  const currentMonth = spendingHistory[currentMonthIndex];
  const previousMonth = spendingHistory[previousMonthIndex];

  // Handle edge case: no previous month data (first month of tracking)
  if (!previousMonth || (previousMonth.totalCents === 0 && currentMonth.totalCents === 0)) {
    return (
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        className="rounded-2xl bg-white p-4 shadow-warm"
      >
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-yellow/20">
            <Text className="text-lg">📈</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-medium text-warm-gray-800">
              vs last month
            </Text>
            <Text className="mt-1 text-sm text-warm-gray-500">
              Keep shopping to see trends!
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Calculate the difference
  const difference = currentMonth.totalCents - previousMonth.totalCents;
  const percentageChange = calculatePercentageChange(
    currentMonth.totalCents,
    previousMonth.totalCents
  );
  const isDown = difference < 0;
  const isUp = difference > 0;
  const isFlat = difference === 0;

  // Get display values
  const absDifference = Math.abs(difference);
  const absPercentage = Math.abs(percentageChange);

  // Determine colors and icons
  const iconBgColor = isDown ? "bg-green-100" : isUp ? "bg-coral/20" : "bg-warm-gray-100";
  const iconColor = isDown ? "#10B981" : isUp ? "#FF6B6B" : "#9CA3AF";
  const textColor = isDown ? "text-green-600" : isUp ? "text-coral" : "text-warm-gray-600";
  const badgeBgColor = isDown ? "bg-green-100" : isUp ? "bg-coral/20" : "bg-warm-gray-100";
  const badgeTextColor = isDown ? "text-green-600" : isUp ? "text-coral" : "text-warm-gray-600";

  const Icon = isDown ? TrendingDown : isUp ? TrendingUp : Minus;

  // Generate message
  let message: string;
  let emoji: string;

  if (isDown) {
    message = `You spent ${formatDollars(absDifference)} less!`;
    emoji = "🎉";
  } else if (isUp) {
    message = `You spent ${formatDollars(absDifference)} more`;
    emoji = "";
  } else {
    message = "Same as last month";
    emoji = "";
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(400).springify()}
      className="rounded-2xl bg-white p-4 shadow-warm"
    >
      <View className="flex-row items-center">
        {/* Icon circle */}
        <View
          className={`h-12 w-12 items-center justify-center rounded-full ${iconBgColor}`}
        >
          <Icon size={24} color={iconColor} strokeWidth={2.5} />
        </View>

        {/* Text content */}
        <View className="ml-4 flex-1">
          <Text className="text-sm text-warm-gray-500">vs last month</Text>
          <View className="flex-row items-center mt-1">
            <Text className={`text-base font-semibold ${textColor}`}>
              {message}
            </Text>
            {emoji && (
              <Text className="ml-1 text-base">{emoji}</Text>
            )}
          </View>
        </View>

        {/* Percentage badge */}
        {!isFlat && (
          <Animated.View
            style={badgeAnimatedStyle}
            className={`rounded-full px-3 py-1.5 ${badgeBgColor}`}
          >
            <Text className={`text-sm font-semibold ${badgeTextColor}`}>
              {isDown ? "↓" : "↑"} {absPercentage}%
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
