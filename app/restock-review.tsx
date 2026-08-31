import { Button } from "@/components/ui";
import { AlreadyAddedRestocks } from "@/components/restocks/AlreadyAddedRestocks";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { formatDateWithWeekday, formatFriendlyDate } from "@/lib/formatters";
import { partitionRestockCandidates } from "@/lib/restockReview";
import { useCachedHousehold } from "@/lib/useCachedQuery";
import { useCachedRestockReview } from "@/lib/useCachedRestockReview";
import { useRestockDecisionActions } from "@/lib/useRestockDecisionActions";
import { useAuth } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, Pause, ShoppingBasket } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RestockReviewScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { userId } = useAuth();
  const analytics = useAnalytics();
  const { data: household } = useCachedHousehold(userId);
  const { data: review, isFromCache } = useCachedRestockReview(
    userId,
    household?._id,
  );
  const candidateProductIds = useMemo(
    () => review?.candidates.map((candidate) => candidate.householdProductId),
    [review?.candidates],
  );
  const hasActiveList = Boolean(review?.activeList);
  const sourceName = source === "notification" ? "notification" : "plan";
  const { error, hiddenProductIds, makeDecision, pendingProductIds } =
    useRestockDecisionActions({
      activeListId: review?.activeList?._id,
      candidateProductIds,
      householdId: household?._id,
      marketCountryCode: review?.household.marketCountryCode,
      source: sourceName,
      userId,
    });
  const [whyProductId, setWhyProductId] =
    useState<Id<"householdProducts"> | null>(null);
  const hasTrackedReviewShown = useRef(false);
  const { actionableCandidates: visibleCandidates, alreadyAddedCandidates } =
    useMemo(
      () =>
        partitionRestockCandidates(review?.candidates ?? [], hiddenProductIds),
      [hiddenProductIds, review?.candidates],
    );

  useEffect(() => {
    if (!review || hasTrackedReviewShown.current) return;
    hasTrackedReviewShown.current = true;
    analytics.track("restock review shown", {
      candidate_count_bucket:
        visibleCandidates.length === 0
          ? "0"
          : visibleCandidates.length <= 3
            ? "1-3"
            : "4+",
      source: sourceName,
      market: review.household.marketCountryCode,
    });
  }, [analytics, review, sourceName, visibleCandidates.length]);

  if (review === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-light">
        <ActivityIndicator size="large" color="#C94A4A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          className="h-11 w-11 items-center justify-center rounded-full bg-white"
          accessibilityLabel="Back to Plan"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color="#1A1917" />
        </Pressable>
        <View className="ml-3">
          <Text className="text-xl font-bold text-warm-gray-900">
            Review restocks
          </Text>
          <Text
            className="text-sm text-warm-gray-500"
            accessibilityLabel={`${visibleCandidates.length} ${
              visibleCandidates.length === 1 ? "thing" : "things"
            } need a quick check`}
          >
            {visibleCandidates.length}{" "}
            {visibleCandidates.length === 1 ? "thing" : "things"} need a quick
            check
          </Text>
        </View>
      </View>

      <FlashList
        data={visibleCandidates}
        keyExtractor={(candidate) => candidate.householdProductId}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
        extraData={{ hasActiveList, pendingProductIds, whyProductId }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View>
            {isFromCache && (
              <View className="mb-3 rounded-xl bg-yellow/20 px-3 py-2">
                <Text className="text-sm leading-5 text-yellow-800">
                  Offline choices are saved on this device and will sync in
                  order when you reconnect.
                </Text>
              </View>
            )}
            {!hasActiveList && visibleCandidates.length > 0 && (
              <View className="mb-3 rounded-xl border border-coral/20 bg-coral-soft px-3 py-3">
                <Text className="text-sm font-semibold text-ink">
                  Choose a Next shop before adding items
                </Text>
                <Text className="mt-1 text-sm leading-5 text-ink-secondary">
                  You can still postpone or stop tracking suggestions here.
                </Text>
              </View>
            )}
            <AlreadyAddedRestocks candidates={alreadyAddedCandidates} />
          </View>
        }
        ListEmptyComponent={
          <View className="mt-16 items-center px-8">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-teal/10">
              <Check size={30} color="#297D76" />
            </View>
            <Text className="mt-5 text-center text-2xl font-bold text-warm-gray-900">
              Your plan is up to date
            </Text>
            <Text className="mt-2 text-center leading-6 text-warm-gray-600">
              We'll check again when something may need attention.
            </Text>
            <Button onPress={() => router.replace("/(tabs)")} className="mt-6">
              Back to Plan
            </Button>
          </View>
        }
        renderItem={({ item: candidate }) => {
          const isBusy = pendingProductIds.has(candidate.householdProductId);
          return (
            <View className="rounded-2xl border border-warm-gray-200 bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-lg font-bold text-warm-gray-900">
                    {candidate.displayName}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-warm-gray-500">
                    {candidate.lastPurchasedAt
                      ? `Last bought ${formatFriendlyDate(
                          candidate.lastPurchasedAt,
                          Date.now(),
                          {
                            locale: review.household.locale,
                            timeZone: review.household.planningTimeZone,
                          },
                        )}`
                      : `Usually bought every ${candidate.cadenceDays} days`}
                  </Text>
                </View>
                {candidate.isAdded && (
                  <View className="rounded-full bg-teal/10 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-teal">
                      Added
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() =>
                  setWhyProductId((current) =>
                    current === candidate.householdProductId
                      ? null
                      : candidate.householdProductId,
                  )
                }
                className="min-h-12 self-start justify-center"
                accessibilityLabel={`Why ${candidate.displayName} is being suggested`}
                accessibilityRole="button"
              >
                <Text className="text-sm font-semibold text-coral">
                  Why this?
                </Text>
              </Pressable>
              {whyProductId === candidate.householdProductId && (
                <View className="mb-2 rounded-xl bg-warm-gray-50 p-3">
                  <Text className="text-sm leading-5 text-warm-gray-600">
                    {`You chose a ${candidate.cadenceDays}-day rhythm. Based on the saved dates, it may be due around ${formatDateWithWeekday(
                      candidate.expectedDueAt,
                      {
                        locale: review.household.locale,
                        timeZone: review.household.planningTimeZone,
                      },
                    )}.`}
                  </Text>
                </View>
              )}

              <Button
                onPress={() =>
                  void makeDecision(candidate.householdProductId, "add")
                }
                disabled={isBusy || candidate.isAdded || !hasActiveList}
                loading={isBusy}
                className="mt-4 w-full"
                accessibilityLabel={
                  candidate.isAdded
                    ? `${candidate.displayName} already added to shop`
                    : !hasActiveList
                      ? `Choose a Next shop before adding ${candidate.displayName}`
                      : `Add ${candidate.displayName} to shop`
                }
              >
                <View className="flex-row items-center">
                  <ShoppingBasket size={18} color="#FFFFFF" />
                  <Text className="ml-2 font-semibold text-white">
                    {candidate.isAdded
                      ? "Added to shop"
                      : hasActiveList
                        ? "Add to shop"
                        : "Choose Next shop first"}
                  </Text>
                </View>
              </Button>
              <View className="mt-2 flex-row gap-2">
                <Pressable
                  onPress={() =>
                    void makeDecision(
                      candidate.householdProductId,
                      "still_have_some",
                    )
                  }
                  disabled={isBusy}
                  className="min-h-12 flex-1 items-center justify-center rounded-full bg-warm-gray-100 px-2"
                >
                  <Text className="text-center font-semibold text-warm-gray-700">
                    Still have some
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    void makeDecision(
                      candidate.householdProductId,
                      "not_this_time",
                    )
                  }
                  disabled={isBusy}
                  className="min-h-12 flex-1 items-center justify-center rounded-full bg-warm-gray-100 px-2"
                >
                  <Text className="text-center font-semibold text-warm-gray-700">
                    Not this time
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() =>
                  void makeDecision(
                    candidate.householdProductId,
                    "stop_tracking",
                  )
                }
                disabled={isBusy}
                className="mt-2 min-h-11 flex-row items-center justify-center"
              >
                <Pause size={15} color="#78716C" />
                <Text className="ml-2 text-sm font-semibold text-warm-gray-500">
                  Stop tracking
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          error ? (
            <Text className="mt-4 text-center text-coral">{error}</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
