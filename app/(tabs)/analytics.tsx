import {
  MonthOverMonthComparison,
  ReceiptImageViewer,
  SessionHistoryCard,
  SpendingChart,
} from "@/components/analytics";
import { AnalyticsEmptyState } from "@/components/analytics/EmptyState";
import { TotalDisplay } from "@/components/analytics/TotalDisplay";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Clock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Session with receipt URL for display
interface SessionWithReceiptUrl {
  _id: Id<"shoppingSessions">;
  totalAmount: number;
  storeName?: string;
  sessionDate: number;
  receiptImageId?: Id<"_storage">;
  receiptUrl: string | null;
  shopperName?: string;
  shopperImageUrl?: string;
}

export default function AnalyticsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<SessionWithReceiptUrl | null>(null);
  const [receiptViewerVisible, setReceiptViewerVisible] = useState(false);

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
      : "skip",
  );

  // Get last 6 months spending history for chart
  const spendingHistory = useQuery(
    api.sessions.getMonthlySpendingHistory,
    household?._id
      ? {
          householdId: household._id,
        }
      : "skip",
  );

  // Get recent shopping sessions for history
  const sessions = useQuery(
    api.sessions.getByHousehold,
    household?._id
      ? {
          householdId: household._id,
          limit: 10, // Show last 10 sessions
        }
      : "skip",
  );

  // Handle session card press to view receipt
  const handleSessionPress = (
    session: typeof sessions extends (infer T)[] | undefined ? T : never,
  ) => {
    if (!session) return;
    setSelectedSession({
      _id: session._id,
      totalAmount: session.totalAmount,
      storeName: session.storeName,
      sessionDate: session.sessionDate,
      receiptImageId: session.receiptImageId,
      receiptUrl: session.receiptUrl,
      shopperName: session.shopperName,
      shopperImageUrl: session.shopperImageUrl,
    });
    setReceiptViewerVisible(true);
  };

  const handleCloseReceiptViewer = () => {
    setReceiptViewerVisible(false);
    setSelectedSession(null);
  };

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

            {/* Spending chart */}
            {spendingHistory && spendingHistory.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(300).springify()}
                className="mt-6 rounded-3xl bg-white p-4 shadow-warm"
              >
                <Text className="text-base font-semibold text-warm-gray-800 mb-2">
                  Last 6 Months
                </Text>
                <SpendingChart data={spendingHistory} />
              </Animated.View>
            )}

            {/* Month-over-month comparison card */}
            {spendingHistory && spendingHistory.length >= 2 && (
              <View className="mt-4">
                <MonthOverMonthComparison spendingHistory={spendingHistory} />
              </View>
            )}

            {/* Session history section */}
            <Animated.View
              entering={FadeInDown.delay(500).springify()}
              className="mt-6"
            >
              <View className="flex-row items-center mb-3">
                <Clock size={18} color="#A3A096" strokeWidth={2} />
                <Text className="ml-2 text-base font-semibold text-warm-gray-800">
                  Recent Trips
                </Text>
              </View>

              {sessions && sessions.length > 0 ? (
                <View className="gap-3">
                  {sessions.map((session, index) => (
                    <SessionHistoryCard
                      key={session._id}
                      sessionId={session._id}
                      amount={session.totalAmount}
                      storeName={session.storeName}
                      sessionDate={session.sessionDate}
                      receiptImageUrl={session.receiptUrl}
                      shopperName={session.shopperName}
                      shopperImageUrl={session.shopperImageUrl}
                      index={index}
                      onPress={() => handleSessionPress(session)}
                    />
                  ))}
                </View>
              ) : (
                <View className="rounded-2xl bg-warm-gray-50 p-6 items-center">
                  <Text className="text-3xl mb-2">🧾</Text>
                  <Text className="text-center text-warm-gray-500">
                    Your shopping history will appear here
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Playful message */}
            <Animated.View
              entering={FadeInUp.delay(500).springify()}
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
          </View>
        ) : (
          <AnalyticsEmptyState />
        )}

        {/* Bottom padding for tab bar */}
        <View className="h-24" />
      </ScrollView>

      {/* Receipt image viewer modal */}
      <ReceiptImageViewer
        visible={receiptViewerVisible}
        imageUrl={selectedSession?.receiptUrl ?? null}
        sessionDate={selectedSession?.sessionDate}
        amount={selectedSession?.totalAmount}
        onClose={handleCloseReceiptViewer}
      />
    </SafeAreaView>
  );
}
