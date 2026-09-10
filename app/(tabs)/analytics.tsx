import {
  MonthOverMonthComparison,
  ReceiptImageViewer,
  SessionHistoryCard,
  SpendingChart,
} from "@/components/analytics";
import { AnalyticsEmptyState } from "@/components/analytics/EmptyState";
import { TotalDisplay } from "@/components/analytics/TotalDisplay";
import { MonthlyBudgetPrompt } from "@/components/analytics/MonthlyBudgetPrompt";
import {
  CollapsibleTabHeader,
  TabLargeTitle,
  useCollapsibleHeader,
} from "@/components/navigation/CollapsibleTabHeader";
import { EmptyStateCard, UserAvatar } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { themeColors } from "@/lib/theme";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useUser } from "@clerk/expo";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ReceiptText } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

interface SessionWithReceiptUrl {
  _id: Id<"shoppingSessions">;
  totalAmount?: number;
  storeName?: string;
  sessionDate: number;
  receiptUrl: string | null;
  shopperName?: string;
  shopperImageUrl?: string;
  plannedTotalPence?: number;
  tripBudgetPence?: number;
  paidByName?: string;
}

function SpendingLoadingState() {
  return (
    <SafeAreaView className="flex-1 bg-background-light px-6 pt-5">
      <View className="h-10 w-40 rounded-xl bg-warm-gray-200" />
      <View className="mt-3 h-5 w-52 rounded-lg bg-warm-gray-100" />
      <View className="mt-8 rounded-2xl border border-separator bg-surface p-5">
        <View className="h-4 w-28 rounded-lg bg-warm-gray-100" />
        <View className="mt-3 h-10 w-40 rounded-xl bg-warm-gray-200" />
        <View className="mt-6 h-2 rounded-full bg-warm-gray-100" />
      </View>
    </SafeAreaView>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { onScroll, scrollY } = useCollapsibleHeader();
  const [selectedSession, setSelectedSession] =
    useState<SessionWithReceiptUrl | null>(null);
  const [receiptViewerVisible, setReceiptViewerVisible] = useState(false);
  const household = useQuery(api.households.getCurrentHousehold);
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
  const spendingHistory = useQuery(
    api.sessions.getMonthlySpendingHistory,
    household?._id ? { householdId: household._id } : "skip",
  );
  const sessions = useQuery(
    api.sessions.getByHousehold,
    household?._id ? { householdId: household._id, limit: 10 } : "skip",
  );

  const handleSessionPress = (
    session: typeof sessions extends (infer T)[] | undefined ? T : never,
  ) => {
    if (!session) return;
    setSelectedSession({
      _id: session._id,
      totalAmount: session.totalAmount,
      storeName: session.storeName,
      sessionDate: session.sessionDate,
      receiptUrl: session.receiptUrl,
      shopperName: session.shopperName,
      shopperImageUrl: session.shopperImageUrl,
      plannedTotalPence: session.plannedTotalPence,
      tripBudgetPence: session.tripBudgetPence,
      paidByName: session.paidByName,
    });
    setReceiptViewerVisible(true);
  };

  const handleCloseReceiptViewer = () => {
    setReceiptViewerVisible(false);
    setSelectedSession(null);
  };

  if (household === undefined || monthlyData === undefined) {
    return <SpendingLoadingState />;
  }

  const hasSpendingData = monthlyData.totalPence > 0;
  const hasBudget = monthlyData.monthlyBudgetPence !== undefined;

  return (
    <View className="flex-1 bg-background-light">
      <Animated.ScrollView
        {...keyboardDismissScrollProps}
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: tabBarHeight + 24,
        }}
        scrollIndicatorInsets={{
          top: insets.top + 56,
          bottom: tabBarHeight,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <TabLargeTitle
          title="Spending"
          subtitle="Your grocery budget at a glance"
          scrollY={scrollY}
        />

        <MonthlyBudgetPrompt
          monthlyBudgetPence={monthlyData.monthlyBudgetPence}
          onSetup={() =>
            router.push({ pathname: "/settings", params: { edit: "budget" } })
          }
        />

        {hasSpendingData || hasBudget ? (
          <View className="px-6">
            <View className="rounded-2xl border border-separator bg-surface p-5">
              <TotalDisplay
                amount={monthlyData.totalPence}
                sessionCount={monthlyData.sessionCount}
                monthlyBudgetPence={monthlyData.monthlyBudgetPence}
                remainingPence={monthlyData.remainingPence}
              />
              {spendingHistory && spendingHistory.length >= 2 && (
                <View className="mt-5">
                  <MonthOverMonthComparison spendingHistory={spendingHistory} />
                </View>
              )}
            </View>

            {spendingHistory &&
              spendingHistory.some((month) => month.totalPence > 0) && (
                <View className="mt-6">
                  <Text className="mb-3 text-xl font-heading text-ink">
                    Six-month view
                  </Text>
                  <View className="items-center overflow-hidden rounded-2xl border border-separator bg-surface px-2 py-4">
                    <SpendingChart data={spendingHistory} />
                  </View>
                </View>
              )}

            <View className="mt-7">
              <Text className="mb-3 text-xl font-heading text-ink">
                Recent trips
              </Text>
              <View className="overflow-hidden rounded-2xl border border-separator bg-surface">
                {sessions && sessions.length > 0 ? (
                  sessions.map((session) => (
                    <SessionHistoryCard
                      key={session._id}
                      sessionId={session._id}
                      amount={session.totalAmount}
                      storeName={session.storeName}
                      sessionDate={session.sessionDate}
                      receiptImageUrl={session.receiptUrl}
                      shopperName={session.shopperName}
                      shopperImageUrl={session.shopperImageUrl}
                      plannedTotalPence={session.plannedTotalPence}
                      tripBudgetPence={session.tripBudgetPence}
                      paidByName={session.paidByName}
                      onPress={() => handleSessionPress(session)}
                    />
                  ))
                ) : (
                  <EmptyStateCard
                    title="No trips recorded yet"
                    description="Finished shops will appear here."
                    icon={
                      <ReceiptText
                        size={25}
                        color={themeColors.coral}
                        strokeWidth={2}
                      />
                    }
                    variant="embedded"
                    density="compact"
                  />
                )}
              </View>
            </View>
          </View>
        ) : (
          <AnalyticsEmptyState />
        )}
      </Animated.ScrollView>

      <CollapsibleTabHeader
        title="Spending"
        scrollY={scrollY}
        rightAction={
          <UserAvatar
            name={user?.fullName ?? "You"}
            imageUrl={user?.imageUrl}
            size={48}
            showTooltip={false}
            onPress={() => router.push("/settings")}
            accessibilityLabel="Open settings"
          />
        }
      />

      <ReceiptImageViewer
        visible={receiptViewerVisible}
        imageUrl={selectedSession?.receiptUrl ?? null}
        sessionDate={selectedSession?.sessionDate}
        amount={selectedSession?.totalAmount}
        onClose={handleCloseReceiptViewer}
      />
    </View>
  );
}
