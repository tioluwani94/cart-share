import { View, Text, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { TrendingUp } from "lucide-react-native";

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
 * Get current month name.
 */
function getCurrentMonthName(): string {
  return new Date().toLocaleString("en-US", { month: "long" });
}

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
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    true
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
      withTiming(0.3, { duration: 800 })
    ),
    -1,
    true
  );

  sparkle2.value = withDelay(
    400,
    withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    )
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
          style={[sparkle1Style, { position: "absolute", top: -10, right: -15 }]}
          className="text-2xl"
        >
          ✨
        </Animated.Text>
        <Animated.Text
          style={[sparkle2Style, { position: "absolute", bottom: 10, left: -20 }]}
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

/**
 * Large animated total display.
 */
function TotalDisplay({ amount, sessionCount }: { amount: number; sessionCount: number }) {
  // Scale animation for the total on mount
  const scaleValue = useSharedValue(0.8);

  scaleValue.value = withSequence(
    withTiming(1.05, { duration: 300, easing: Easing.out(Easing.ease) }),
    withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const monthName = getCurrentMonthName();

  return (
    <Animated.View
      entering={FadeInUp.delay(200).springify()}
      style={animatedStyle}
      className="items-center py-6"
    >
      {/* Large total */}
      <Text className="text-5xl font-bold text-coral">
        {formatDollars(amount)}
      </Text>
      <Text className="mt-2 text-lg text-warm-gray-600">
        this {monthName}
      </Text>

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

export default function AnalyticsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // Get current household
  const household = useQuery(api.households.getCurrentHousehold);

  // Get current month's total spending
  const now = new Date();
  const monthlyData = useQuery(
    api.sessions.getMonthlyTotal,
    household?._id
      ? {
          householdId: household._id,
          year: now.getFullYear(),
          month: now.getMonth(),
        }
      : "skip"
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex queries automatically refresh
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Loading state
  if (household === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center">
          <View className="h-8 w-8 animate-spin rounded-full border-4 border-coral border-t-transparent" />
          <Text className="mt-4 text-warm-gray-500">Loading insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasSpendingData = monthlyData && monthlyData.totalCents > 0;

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B6B"
            colors={["#FF6B6B"]}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} className="px-4 pt-4">
          <Text className="text-2xl font-bold text-warm-gray-900">
            Analytics
          </Text>
          <Text className="mt-1 text-warm-gray-600">
            {hasSpendingData
              ? "Here's where your groceries went!"
              : "Track your spending patterns"}
          </Text>
        </Animated.View>

        {hasSpendingData ? (
          /* Main analytics content */
          <View className="px-4 pt-4">
            {/* Total spending card */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="rounded-3xl bg-white p-6 shadow-warm"
            >
              <TotalDisplay
                amount={monthlyData.totalCents}
                sessionCount={monthlyData.sessionCount}
              />
            </Animated.View>

            {/* Playful message */}
            <Animated.View
              entering={FadeInUp.delay(400).springify()}
              className="mt-6 items-center"
            >
              <View className="rounded-2xl bg-yellow/10 px-5 py-3">
                <Text className="text-center text-warm-gray-700">
                  {monthlyData.sessionCount >= 5
                    ? "You're a shopping pro! Keep it up! 🛒✨"
                    : monthlyData.sessionCount >= 3
                      ? "Great progress tracking your spending! 📊"
                      : "Keep scanning receipts to see more insights! 🧾"}
                </Text>
              </View>
            </Animated.View>

            {/* Decorative footer */}
            <View className="mt-8 flex-row justify-center gap-4 opacity-10">
              <Text className="text-4xl">🍎</Text>
              <Text className="text-4xl">🥬</Text>
              <Text className="text-4xl">🥖</Text>
              <Text className="text-4xl">🧀</Text>
              <Text className="text-4xl">🥛</Text>
            </View>
          </View>
        ) : (
          /* Empty state with encouraging illustration */
          <View className="flex-1 items-center justify-center px-4 pt-16">
            <Animated.View entering={FadeInDown.delay(200).springify()}>
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
                💡 After completing a shopping list, tap the camera icon to scan
                your receipt and track your spending.
              </Text>
            </Animated.View>

            {/* Decorative footer */}
            <View className="mt-12 flex-row gap-4 opacity-10">
              <Text className="text-3xl">🛒</Text>
              <Text className="text-3xl">💳</Text>
              <Text className="text-3xl">📱</Text>
            </View>
          </View>
        )}

        {/* Bottom padding for tab bar */}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
