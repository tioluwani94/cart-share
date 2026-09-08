import { CreateListSheet } from "@/components/lists";
import {
  CollapsibleTabHeader,
  TabLargeTitle,
  useCollapsibleHeader,
} from "@/components/navigation/CollapsibleTabHeader";
import { NextShopChooser } from "@/components/restocks/NextShopChooser";
import { QuickCheckSection } from "@/components/restocks/QuickCheckSection";
import { NextShopCard } from "@/components/restocks/NextShopCard";
import { OtherPlansSection } from "@/components/restocks/OtherPlansSection";
import { NextShopScheduleSheet } from "@/components/restocks/NextShopScheduleSheet";
import { type GlassBottomSheetRef, UserAvatar } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { getDaysUntilShopBucket } from "@/lib/analytics";
import { useAnalytics } from "@/lib/AnalyticsContext";
import {
  getEffectiveShoppingMode,
  shouldWaitForPlanLists,
  type ShoppingMode,
} from "@/lib/shoppingList";
import { useCachedHousehold, useCachedLists } from "@/lib/useCachedQuery";
import { useCachedRestockReview } from "@/lib/useCachedRestockReview";
import { useRestockDecisionActions } from "@/lib/useRestockDecisionActions";
import { themeColors } from "@/lib/theme";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { CloudOff } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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

export default function PlanScreen() {
  const router = useRouter();
  const analytics = useAnalytics();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { onScroll, scrollY } = useCollapsibleHeader();
  const bottomSheetRef = useRef<GlassBottomSheetRef>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [choosingListId, setChoosingListId] = useState<Id<"lists"> | null>(
    null,
  );
  const [createAsNextShop, setCreateAsNextShop] = useState(false);
  const [nextShopError, setNextShopError] = useState<string | null>(null);
  const { data: household } = useCachedHousehold(user?.id);
  const {
    data: lists,
    isFromCache,
    isLoading: areListsLoading,
  } = useCachedLists(household?._id);
  const { data: review, isOnline } = useCachedRestockReview(
    user?.id,
    household?._id,
  );
  const candidateProductIds = useMemo(
    () => review?.candidates.map((candidate) => candidate.householdProductId),
    [review?.candidates],
  );
  const setNextShop = useMutation(api.restocks.setNextShop);
  const recalculate = useMutation(api.notifications.recalculateForHousehold);
  const {
    error: decisionError,
    hiddenProductIds,
    makeDecision,
    undoDecision,
  } = useRestockDecisionActions({
    activeListId: review?.activeList?._id,
    candidateProductIds,
    householdId: household?._id,
    marketCountryCode: review?.household.marketCountryCode,
    source: "plan",
    enableUndo: true,
    userId: user?.id,
  });

  const otherLists = useMemo(
    () => (lists ?? []).filter((list) => list._id !== review?.activeList?._id),
    [lists, review?.activeList?._id],
  );
  const effectiveShoppingMode = getEffectiveShoppingMode(
    review?.activeList?.shoppingMode,
    review?.household.preferredShoppingMode,
  );
  const saveSchedule = useCallback(
    async (plannedFor: number, shoppingMode: ShoppingMode) => {
      if (!review?.activeList || !isOnline)
        throw new Error("No active online shop");
      await setNextShop({
        listId: review.activeList._id,
        plannedFor,
        shoppingMode,
      });
      try {
        await recalculate({});
      } catch (error) {
        console.error("Couldn't refresh reminder timing:", error);
      }
      analytics.track("shop planned", {
        household_id: household?._id,
        days_until_shop_bucket: getDaysUntilShopBucket(plannedFor),
      });
    },
    [
      analytics,
      household?._id,
      recalculate,
      review?.activeList,
      setNextShop,
      isOnline,
    ],
  );

  const chooseExistingList = useCallback(
    async (listId: Id<"lists">) => {
      if (!isOnline || choosingListId) return;
      setChoosingListId(listId);
      setNextShopError(null);
      try {
        await setNextShop({ listId, onlyIfNoActiveList: true });
      } catch (error) {
        console.error("Couldn't choose the next shop:", error);
        setNextShopError("We couldn't choose that list. Please try again.");
        setChoosingListId(null);
        return;
      }

      try {
        await recalculate({});
      } catch (error) {
        console.error("Couldn't refresh reminder timing:", error);
      } finally {
        setChoosingListId(null);
      }
    },
    [choosingListId, isOnline, recalculate, setNextShop],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (
    household === undefined ||
    review === undefined ||
    shouldWaitForPlanLists({ areListsLoading, isOnline })
  ) {
    return <PlanLoadingState />;
  }

  const activeList = review.activeList;

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.coral}
            progressViewOffset={insets.top + 56}
          />
        }
      >
        <TabLargeTitle
          title="Plan"
          subtitle="Keep the next shop easy"
          scrollY={scrollY}
        />

        <View className="px-6">
          {isFromCache && (
            <View className="mb-3 flex-row items-center rounded-xl bg-yellow/20 px-3 py-2">
              <CloudOff size={16} color={themeColors.warningInk} />
              <Text className="ml-2 text-sm text-yellow-900">
                Showing your saved offline plan
              </Text>
            </View>
          )}

          <QuickCheckSection
            key={`${review.household._id}:${activeList?._id ?? "no-list"}`}
            review={review}
            hiddenIds={hiddenProductIds}
            error={decisionError}
            isOnline={isOnline}
            makeDecision={makeDecision}
            undoDecision={undoDecision}
            onShop={() => router.push("/(tabs)/shop" as Href)}
            onPantry={() => router.push("/(tabs)/pantry" as Href)}
          />

          {activeList ? (
            <NextShopCard
              name={activeList.name}
              plannedFor={activeList.plannedFor}
              totalItems={activeList.totalItems}
              plannedTotalPence={activeList.plannedTotalPence}
              tripBudgetPence={activeList.tripBudgetPence}
              shoppingMode={effectiveShoppingMode}
              locale={review.household.locale}
              timeZone={review.household.planningTimeZone}
              onEdit={() => setEditingSchedule(true)}
              onOpen={() => router.navigate("/(tabs)/shop" as Href)}
            />
          ) : (
            <NextShopChooser
              choosingListId={choosingListId}
              error={nextShopError}
              existingLists={otherLists}
              isOnline={isOnline}
              onChoose={(listId) => void chooseExistingList(listId)}
              onCreate={() => {
                setCreateAsNextShop(true);
                bottomSheetRef.current?.present();
              }}
            />
          )}

          {activeList && (
            <OtherPlansSection
              lists={otherLists}
              isOnline={isOnline}
              onOpen={(id) => router.push(`/list/${id}`)}
              onCreate={() => {
                setCreateAsNextShop(false);
                bottomSheetRef.current?.present();
              }}
            />
          )}
        </View>
      </Animated.ScrollView>

      <CollapsibleTabHeader
        title="Plan"
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
      <CreateListSheet ref={bottomSheetRef} setAsNextShop={createAsNextShop} />
      {editingSchedule && activeList && (
        <NextShopScheduleSheet
          key={activeList._id}
          plannedFor={activeList.plannedFor}
          shoppingMode={effectiveShoppingMode}
          locale={review.household.locale}
          timeZone={review.household.planningTimeZone}
          isOnline={isOnline}
          onSave={saveSchedule}
          onClose={() => setEditingSchedule(false)}
        />
      )}
    </View>
  );
}
