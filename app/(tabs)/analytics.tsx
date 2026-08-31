import {
  MonthOverMonthComparison,
  ReceiptImageViewer,
  SessionHistoryCard,
  SpendingChart,
} from "@/components/analytics";
import { AnalyticsEmptyState } from "@/components/analytics/EmptyState";
import { TotalDisplay } from "@/components/analytics/TotalDisplay";
import { UserAvatar } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { themeColors } from "@/lib/theme";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ReceiptText } from "lucide-react-native";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (household === undefined || monthlyData === undefined) {
    return <SpendingLoadingState />;
  }

  const hasSpendingData = monthlyData.totalPence > 0;
  const hasBudget = monthlyData.monthlyBudgetPence !== undefined;

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.coral}
            colors={[themeColors.coral]}
          />
        }
      >
        <View className="flex-row items-center justify-between px-6 pb-5 pt-4">
          <View className="flex-1 pr-4">
            <Text className="text-4xl font-bold tracking-tight text-ink">
              Spending
            </Text>
            <Text className="mt-1 text-base text-ink-secondary">
              Your grocery budget at a glance
            </Text>
          </View>
          <UserAvatar
            name={user?.fullName ?? "You"}
            imageUrl={user?.imageUrl}
            size={48}
            showTooltip={false}
            onPress={() => router.push("/settings")}
            accessibilityLabel="Open settings"
          />
        </View>

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
                  <MonthOverMonthComparison
                    spendingHistory={spendingHistory}
                  />
                </View>
              )}
            </View>

            {spendingHistory && spendingHistory.some((month) => month.totalPence > 0) && (
              <View className="mt-6">
                <Text className="mb-3 text-xl font-bold text-ink">
                  Six-month view
                </Text>
                <View className="items-center overflow-hidden rounded-2xl border border-separator bg-surface px-2 py-4">
                  <SpendingChart data={spendingHistory} />
                </View>
              </View>
            )}

            <View className="mt-7">
              <Text className="mb-3 text-xl font-bold text-ink">
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
                  <View className="items-center px-6 py-8">
                    <ReceiptText
                      size={28}
                      color={themeColors.secondaryInk}
                      strokeWidth={2}
                    />
                    <Text className="mt-3 text-center text-base font-semibold text-ink">
                      No trips recorded yet
                    </Text>
                    <Text className="mt-1 text-center text-sm text-ink-secondary">
                      Finished shops will appear here.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <AnalyticsEmptyState />
        )}
      </ScrollView>

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
