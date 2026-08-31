import { Button } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { formatDateWithWeekday, formatFriendlyDate } from "@/lib/formatters";
import type { OfflineScope } from "@/lib/offlineQueue";
import { useCachedHousehold } from "@/lib/useCachedQuery";
import { useCachedRestockReview } from "@/lib/useCachedRestockReview";
import { useScopedOfflineQueue } from "@/lib/useScopedOfflineQueue";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, Pause, ShoppingBasket } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Decision = "add" | "still_have_some" | "not_this_time" | "stop_tracking";

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
  const queueScope = useMemo<OfflineScope | null>(
    () =>
      userId && household?._id
        ? { clerkUserId: userId, householdId: household._id }
        : null,
    [household?._id, userId],
  );
  const { addToQueue, isOnline, queue } = useScopedOfflineQueue(queueScope);
  const decide = useMutation(api.restocks.decide);
  const recalculate = useMutation(api.notifications.recalculateForHousehold);
  const [busyProductId, setBusyProductId] =
    useState<Id<"householdProducts"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whyProductId, setWhyProductId] =
    useState<Id<"householdProducts"> | null>(null);
  const queuedProductIds = useMemo(
    () =>
      new Set(
        queue
          .filter((operation) => operation.type === "restocks.decide")
          .map((operation) => operation.args.householdProductId),
      ),
    [queue],
  );
  const visibleCandidates =
    review?.candidates.filter(
      (candidate) => !queuedProductIds.has(candidate.householdProductId),
    ) ?? [];

  useEffect(() => {
    if (!review) return;
    analytics.track("restock review shown", {
      candidate_count_bucket:
        review.candidateCount === 0
          ? "0"
          : review.candidateCount <= 3
            ? "1-3"
            : "4+",
      source: source === "notification" ? "notification" : "plan",
      market: review.household.marketCountryCode,
    });
  }, [analytics, review, source]);

  const makeDecision = async (
    householdProductId: Id<"householdProducts">,
    decision: Decision,
  ) => {
    setBusyProductId(householdProductId);
    setError(null);
    try {
      const operationId = `restock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      if (isOnline) {
        await decide({ householdProductId, decision, operationId });
        await recalculate({});
      } else {
        addToQueue({
          type: "restocks.decide",
          args: { householdProductId, decision, operationId },
        });
      }
      analytics.track("restock decision made", {
        decision,
        source: source === "notification" ? "notification" : "plan",
        market: review?.household.marketCountryCode,
      });
    } catch (caughtError) {
      console.error("Couldn't save restock decision:", caughtError);
      setError("That change wasn't saved. Please try again.");
    } finally {
      setBusyProductId(null);
    }
  };

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
          onPress={() => router.back()}
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
          <Text className="text-sm text-warm-gray-500">
            {visibleCandidates.length} things need a quick check
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8 pt-2">
        {isFromCache && (
          <View className="mb-3 rounded-xl bg-yellow/20 px-3 py-2">
            <Text className="text-sm leading-5 text-yellow-800">
              Offline choices are saved on this device and will sync in order when you reconnect.
            </Text>
          </View>
        )}
        {visibleCandidates.length === 0 ? (
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
        ) : (
          <View className="gap-3">
            {visibleCandidates.map((candidate) => {
              const isBusy = busyProductId === candidate.householdProductId;
              return (
                <View
                  key={candidate.householdProductId}
                  className="rounded-2xl border border-warm-gray-200 bg-white p-4"
                >
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
                        {`You chose a ${candidate.cadenceDays}-day rhythm. Based on the saved dates, it may be due around ${formatDateWithWeekday(candidate.expectedDueAt, {
                          locale: review.household.locale,
                          timeZone: review.household.planningTimeZone,
                        })}.`}
                      </Text>
                    </View>
                  )}

                  <Button
                    onPress={() =>
                      void makeDecision(candidate.householdProductId, "add")
                    }
                    disabled={isBusy || candidate.isAdded}
                    loading={isBusy}
                    className="mt-4 w-full"
                  >
                    <View className="flex-row items-center">
                      <ShoppingBasket size={18} color="#FFFFFF" />
                      <Text className="ml-2 font-semibold text-white">
                        {candidate.isAdded ? "Added to shop" : "Add to shop"}
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
            })}
          </View>
        )}
        {error && <Text className="mt-4 text-center text-coral">{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}
