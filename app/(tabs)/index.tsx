import { CreateListSheet, ListCard } from "@/components/lists";
import {
  Button,
  type GlassBottomSheetRef,
  UserAvatar,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { formatCurrencyFromPence, formatDateWithWeekday } from "@/lib/formatters";
import {
  getEffectiveShoppingMode,
  type ShoppingMode,
} from "@/lib/shoppingList";
import { cn } from "@/lib/cn";
import { useCachedHousehold, useCachedLists } from "@/lib/useCachedQuery";
import { useCachedRestockReview } from "@/lib/useCachedRestockReview";
import { themeColors } from "@/lib/theme";
import { useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { type Href, useRouter } from "expo-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Plus,
  SlidersHorizontal,
  ShoppingBasket,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DAY_MS = 24 * 60 * 60 * 1000;

function PlanLoadingState() {
  return (
    <SafeAreaView className="flex-1 bg-background-light px-6 pt-5">
      <View className="h-10 w-28 rounded-xl bg-warm-gray-200" />
      <View className="mt-3 h-5 w-48 rounded-lg bg-warm-gray-100" />
      <View className="mt-8 rounded-2xl border border-separator bg-surface p-5">
        <View className="h-5 w-24 rounded-lg bg-warm-gray-200" />
        <View className="mt-3 h-8 w-40 rounded-lg bg-warm-gray-200" />
        <View className="mt-3 h-5 w-32 rounded-lg bg-warm-gray-100" />
        <View className="mt-6 h-12 rounded-xl bg-warm-gray-200" />
      </View>
    </SafeAreaView>
  );
}

function nextSaturday(now = new Date()): number {
  const date = new Date(now);
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  date.setHours(10, 0, 0, 0);
  return date.getTime();
}

export default function PlanScreen() {
  const router = useRouter();
  const { user } = useUser();
  const bottomSheetRef = useRef<GlassBottomSheetRef>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [isChangingMode, setIsChangingMode] = useState(false);
  const [shoppingModeError, setShoppingModeError] = useState<string | null>(null);
  const [optimisticShoppingMode, setOptimisticShoppingMode] =
    useState<ShoppingMode | null>(null);
  const { data: household } = useCachedHousehold(user?.id);
  const { data: lists, isFromCache } = useCachedLists(household?._id);
  const { data: review } = useCachedRestockReview(user?.id, household?._id);
  const setNextShop = useMutation(api.restocks.setNextShop);
  const recalculate = useMutation(api.notifications.recalculateForHousehold);

  const otherLists = useMemo(
    () =>
      (lists ?? []).filter((list) => list._id !== review?.activeList?._id),
    [lists, review?.activeList?._id],
  );
  const effectiveShoppingMode = getEffectiveShoppingMode(
    review?.activeList?.shoppingMode,
    review?.household.preferredShoppingMode,
  );
  const displayedShoppingMode =
    optimisticShoppingMode ?? effectiveShoppingMode;

  useEffect(() => {
    if (review?.activeList?.shoppingMode === optimisticShoppingMode) {
      setOptimisticShoppingMode(null);
    }
  }, [optimisticShoppingMode, review?.activeList?.shoppingMode]);

  const scheduleSaturday = useCallback(async () => {
    if (!review?.activeList) return;
    setIsPlanning(true);
    setPlanningError(null);
    try {
      await setNextShop({
        listId: review.activeList._id,
        plannedFor: nextSaturday(),
      });
      await recalculate({});
    } catch (error) {
      console.error("Couldn't schedule the next shop:", error);
      setPlanningError("We couldn't save that date. Please try again.");
    } finally {
      setIsPlanning(false);
    }
  }, [recalculate, review?.activeList, setNextShop]);

  const chooseShoppingMode = useCallback(
    async (shoppingMode: ShoppingMode) => {
      if (!review?.activeList || shoppingMode === displayedShoppingMode) return;
      const previousMode = displayedShoppingMode;
      setOptimisticShoppingMode(shoppingMode);
      setIsChangingMode(true);
      setShoppingModeError(null);
      try {
        await setNextShop({ listId: review.activeList._id, shoppingMode });
      } catch (error) {
        console.error("Couldn't update the shopping mode:", error);
        setOptimisticShoppingMode(previousMode);
        setShoppingModeError(
          "We couldn't save that shopping mode. Please try again.",
        );
      } finally {
        setIsChangingMode(false);
      }
    }, [displayedShoppingMode, review?.activeList, setNextShop],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (household === undefined || review === undefined) {
    return <PlanLoadingState />;
  }

  const activeList = review.activeList;
  const dateOptions = {
    locale: review.household.locale,
    timeZone: review.household.planningTimeZone,
  };
  const nextReviewDate =
    Date.now() + (review.household.shoppingCadenceDays ?? 7) * DAY_MS;

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 pb-5 pt-4">
        <View className="flex-1 pr-4">
          <Text className="text-4xl font-bold tracking-tight text-ink">Plan</Text>
          <Text className="mt-1 text-base text-ink-secondary">
            Keep the next shop easy
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

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.coral}
          />
        }
        contentContainerClassName="pb-10"
      >
        {isFromCache && (
          <View className="mb-3 flex-row items-center rounded-xl bg-yellow/20 px-3 py-2">
            <CloudOff size={16} color={themeColors.warningInk} />
            <Text className="ml-2 text-sm text-yellow-900">
              Showing your saved offline plan
            </Text>
          </View>
        )}

        {activeList ? (
          <View className="rounded-2xl border border-separator bg-surface p-5">
            <View className="flex-row items-start">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-coral-soft">
                <ShoppingBasket size={23} color={themeColors.coral} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-coral">
                  Next shop
                </Text>
                <Text
                  className="mt-0.5 text-2xl font-bold text-ink"
                  numberOfLines={2}
                >
                  {activeList.name}
                </Text>
                <Text className="mt-1 text-base text-ink-secondary">
                  {activeList.plannedFor
                    ? formatDateWithWeekday(activeList.plannedFor, dateOptions)
                    : "Choose a day when you're ready"}
                </Text>
              </View>
              {shoppingModeError && (
                <Text className="mt-2 text-sm text-red-600">
                  {shoppingModeError}
                </Text>
              )}
            </View>

            <View className="mt-5 flex-row flex-wrap items-center border-t border-separator pt-4">
              <Text className="text-sm font-medium text-ink-secondary">
                {activeList.totalItems} {activeList.totalItems === 1 ? "item" : "items"}
              </Text>
              <Text className="mx-2 text-warm-gray-400">·</Text>
              <Text className="text-sm font-medium text-ink-secondary">
                {activeList.plannedTotalPence > 0
                  ? `${formatCurrencyFromPence(activeList.plannedTotalPence)} planned`
                  : activeList.tripBudgetPence !== undefined
                    ? `${formatCurrencyFromPence(activeList.tripBudgetPence)} budget`
                    : "Prices optional"}
              </Text>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-ink-secondary">
                How will you shop?
              </Text>
              <View className="mt-2 flex-row rounded-full bg-warm-gray-100 p-1">
                {(
                  [
                    ["In store", "in_store"],
                    ["Online", "online"],
                  ] as const
                ).map(([label, mode]) => {
                  const selected = displayedShoppingMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => void chooseShoppingMode(mode)}
                      disabled={isChangingMode}
                      className={cn(
                        "min-h-11 flex-1 items-center justify-center rounded-full px-4",
                        selected && "bg-surface",
                      )}
                      accessibilityLabel={`Shop ${label.toLocaleLowerCase("en-GB")}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: isChangingMode }}
                    >
                      <Text
                        className={cn(
                          "font-semibold",
                          selected ? "text-ink" : "text-ink-secondary",
                        )}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Button
              onPress={() =>
                router.push(
                  (review.candidateCount > 0
                    ? "/restock-review"
                    : "/(tabs)/shop") as Href,
                )
              }
              className="mt-5 w-full"
              accessibilityLabel={
                review.candidateCount > 0
                  ? `Review ${review.candidateCount} suggested restocks`
                  : "Start shopping"
              }
            >
              {review.candidateCount > 0
                ? `Review ${review.candidateCount} ${review.candidateCount === 1 ? "item" : "items"}`
                : "Start shopping"}
            </Button>

            {review.candidateCount > 0 && (
              <Button
                variant="tonal"
                onPress={() => router.push("/(tabs)/shop" as Href)}
                className="mt-2 w-full"
                accessibilityLabel="Start shopping without reviewing restocks"
              >
                Start shopping
              </Button>
            )}
          </View>
        ) : (
          <View className="rounded-2xl border border-separator bg-surface p-5">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-coral-soft">
              <ShoppingBasket size={23} color={themeColors.coral} />
            </View>
            <Text className="mt-4 text-2xl font-bold text-ink">
              Choose your next shop
            </Text>
            <Text className="mt-2 text-base leading-6 text-ink-secondary">
              Create a list and we'll keep likely restocks together for you.
            </Text>
            <Button
              onPress={() => bottomSheetRef.current?.present()}
              className="mt-5 w-full"
            >
              Create Next shop
            </Button>
          </View>
        )}

        {activeList && !activeList.plannedFor && (
          <Pressable
            onPress={() => void scheduleSaturday()}
            disabled={isPlanning}
            className="mt-3 min-h-16 flex-row items-center rounded-2xl border border-separator bg-surface p-4"
            accessibilityLabel="Plan the next shop for Saturday"
            accessibilityRole="button"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-yellow/20">
              <CalendarDays size={20} color={themeColors.warningInk} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-ink">
                Plan for Saturday
              </Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                {formatDateWithWeekday(nextSaturday(), dateOptions)}
              </Text>
            </View>
            {isPlanning ? (
              <ActivityIndicator color={themeColors.coral} />
            ) : (
              <ChevronRight size={20} color={themeColors.secondaryInk} />
            )}
          </Pressable>
        )}
        {planningError && (
          <Text className="mt-2 text-sm text-red-600">{planningError}</Text>
        )}

        <View className="mt-8 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-xl font-bold text-ink">
              Restock check
            </Text>
            <Text className="mt-1 text-sm leading-5 text-ink-secondary">
              {review.candidateCount > 0
                ? `${review.candidateCount} ${review.candidateCount === 1 ? "item may" : "items may"} need a quick check`
                : `Next check around ${formatDateWithWeekday(nextReviewDate, dateOptions)}`}
            </Text>
          </View>
          {review.candidateCount > 0 && (
            <View className="rounded-full bg-coral-soft px-3 py-1.5">
              <Text className="text-sm font-semibold text-coral">
                {review.candidateCount}
              </Text>
            </View>
          )}
        </View>

        {review.candidateCount > 0 ? (
          <Pressable
            onPress={() => router.push("/restock-review" as Href)}
            className="mt-3 overflow-hidden rounded-2xl border border-separator bg-surface px-4"
            accessibilityLabel="Open restock review"
            accessibilityRole="button"
          >
            {review.candidates.slice(0, 3).map((candidate, index) => (
              <View
                key={candidate.householdProductId}
                className={cn(
                  "min-h-14 flex-row items-center py-3",
                  index > 0 && "border-t border-separator",
                )}
              >
                <Text className="flex-1 text-base font-medium text-ink">
                  {candidate.displayName}
                </Text>
                <Text className="mr-1 text-sm font-medium text-coral">
                  Review
                </Text>
                <ChevronRight size={18} color={themeColors.coral} />
              </View>
            ))}
          </Pressable>
        ) : (
          <View className="mt-3 flex-row items-center rounded-2xl border border-teal/20 bg-teal-soft p-4">
            <CheckCircle2 size={24} color={themeColors.teal} />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-ink">
                Your plan is up to date
              </Text>
              <Text className="mt-0.5 text-sm leading-5 text-ink-secondary">
                We'll bring anything uncertain back for a quick check.
              </Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={() => router.push("/tracked-products" as Href)}
          className="mt-3 min-h-16 flex-row items-center rounded-2xl border border-separator bg-surface p-4"
          accessibilityLabel="Manage tracked products"
          accessibilityRole="button"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-warm-gray-100">
            <SlidersHorizontal size={20} color={themeColors.secondaryInk} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-ink">Tracked products</Text>
            <Text className="mt-0.5 text-sm text-ink-secondary">
              Adjust timing or pause reminders
            </Text>
          </View>
          <ChevronRight size={20} color={themeColors.secondaryInk} />
        </Pressable>

        {otherLists.length > 0 && (
          <View className="mt-7">
            <Text className="mb-3 text-xl font-bold text-ink">
              Other lists
            </Text>
            {otherLists.map((list, index) => (
              <ListCard
                key={list._id}
                id={list._id}
                name={list.name}
                category={list.category}
                totalItems={list.totalItems}
                completedItems={list.completedItems}
                onPress={() => router.push(`/list/${list._id}`)}
                index={index}
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={() => bottomSheetRef.current?.present()}
          className="mt-7 min-h-12 flex-row items-center justify-center rounded-full border border-separator bg-surface px-4"
          accessibilityLabel="Create another list"
          accessibilityRole="button"
        >
          <Plus size={20} color={themeColors.secondaryInk} />
          <Text className="ml-2 font-semibold text-ink-secondary">New list</Text>
        </Pressable>
      </ScrollView>
      <CreateListSheet ref={bottomSheetRef} />
    </SafeAreaView>
  );
}
