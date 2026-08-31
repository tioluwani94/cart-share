import { AddItemInput, ListItem } from "@/components/lists";
import {
  Button,
  GlassBottomSheet,
  GlassBottomSheetView,
  type GlassBottomSheetRef,
} from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { getItemCountBucket } from "@/lib/analytics";
import { formatCurrencyFromPence, formatDateWithWeekday } from "@/lib/formatters";
import {
  getManualReceiptEntryRoute,
  getReceiptCaptureRoute,
} from "@/lib/receiptFlow";
import {
  buildShoppingListHandoff,
  canFinishShoppingList,
  getEffectiveShoppingMode,
  type PreferredShoppingMode,
} from "@/lib/shoppingList";
import { themeColors } from "@/lib/theme";
import { useCachedHousehold } from "@/lib/useCachedQuery";
import { useCachedRestockReview } from "@/lib/useCachedRestockReview";
import { useShoppingList } from "@/lib/useShoppingList";
import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import * as Clipboard from "expo-clipboard";
import { type Href, useRouter } from "expo-router";
import {
  Camera,
  Check,
  CloudOff,
  Copy,
  PoundSterling,
  Receipt,
  Share2,
  ShoppingBasket,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function ShopLoadingState() {
  return (
    <SafeAreaView className="flex-1 bg-background-light px-6 pt-5">
      <View className="h-10 w-28 rounded-xl bg-warm-gray-200" />
      <View className="mt-3 h-5 w-48 rounded-lg bg-warm-gray-100" />
      <View className="mt-8 h-2 rounded-full bg-warm-gray-200" />
      <View className="mt-4 h-16 border-b border-separator" />
      <View className="h-16 border-b border-separator" />
      <View className="h-16 border-b border-separator" />
    </SafeAreaView>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { data: household } = useCachedHousehold(user?.id);
  const { data: review } = useCachedRestockReview(user?.id, household?._id);

  if (household === undefined || review === undefined) {
    return <ShopLoadingState />;
  }

  if (!household || !review.activeList) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-light px-8">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
          <ShoppingBasket size={30} color={themeColors.coral} />
        </View>
        <Text className="mt-5 text-center text-2xl font-bold text-ink">
          No shop is planned yet
        </Text>
        <Text className="mt-2 text-center text-base leading-6 text-ink-secondary">
          Choose a Next shop on Plan, then come back when you're ready to shop.
        </Text>
        <Button onPress={() => router.replace("/(tabs)" as Href)} className="mt-6">
          Go to Plan
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <ActiveShop
      householdId={household._id}
      list={review.activeList}
      locale={review.household.locale}
      planningTimeZone={review.household.planningTimeZone}
      preferredShoppingMode={review.household.preferredShoppingMode}
    />
  );
}

interface ActiveShopProps {
  householdId: Id<"households">;
  locale: string;
  planningTimeZone: string;
  preferredShoppingMode?: PreferredShoppingMode;
  list: {
    _id: Id<"lists">;
    name: string;
    plannedFor?: number;
    tripBudgetPence?: number;
    shoppingMode?: "in_store" | "online";
  };
}

function ActiveShop({
  householdId,
  list,
  locale,
  planningTimeZone,
  preferredShoppingMode,
}: ActiveShopProps) {
  const router = useRouter();
  const analytics = useAnalytics();
  const {
    items,
    isFromCache,
    isLoading,
    addItem,
    toggleComplete,
    removeItem,
    isPendingSync,
    isOnline,
    queueLength,
    isProcessing,
    hasSyncError,
    hasQueuedCompletion,
    retrySync,
    completeShop,
    completedCount,
    totalItems: totalCount,
    progress,
    plannedTotalPence,
  } = useShoppingList(list._id, householdId);
  const finishSheetRef = useRef<GlassBottomSheetRef>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [completionQueued, setCompletionQueued] = useState(
    hasQueuedCompletion,
  );
  const [finishError, setFinishError] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<
    "idle" | "copied" | "error"
  >("idle");

  const canFinish = canFinishShoppingList({
    totalItems: totalCount,
    isFinishing,
    hasQueuedCompletion,
  });
  const canScanReceipt =
    canFinish && isOnline && queueLength === 0 && !hasQueuedCompletion;
  const canAddSpend = canScanReceipt;
  const syncMessage = hasQueuedCompletion
    ? isOnline
      ? "Finishing this shop now that you're connected."
      : "This shop is saved on this device and will finish when you're back online."
    : !isOnline
      ? "Offline changes are saved on this device. You can finish now and sync later."
    : queueLength > 0
      ? `${queueLength} ${queueLength === 1 ? "change is" : "changes are"} syncing before you can finish.`
      : "Showing saved items while the latest version loads.";
  const finishUnavailableMessage =
    totalCount === 0
      ? "Add at least one item before finishing this shop."
      : hasQueuedCompletion
        ? "This shop is already waiting to sync."
        : null;
  const shoppingMode = getEffectiveShoppingMode(
    list.shoppingMode,
    preferredShoppingMode,
  );
  const handoffText = buildShoppingListHandoff({
    listName: list.name,
    items: items ?? [],
  });

  useEffect(() => {
    setHandoffStatus("idle");
  }, [handoffText]);

  useEffect(() => {
    if (hasQueuedCompletion) setCompletionQueued(true);
  }, [hasQueuedCompletion]);

  useEffect(() => {
    analytics.track("shop started", {
      household_id: householdId,
      mode: list.shoppingMode === "online" ? "online" : "physical",
    });
  }, [analytics, householdId, list.shoppingMode]);

  const handleAdd = useCallback(
    async (name: string) => {
      await addItem(name);
      analytics.track("shopping item added", {
        household_id: householdId,
        source: "manual",
      });
    },
    [addItem, analytics, householdId],
  );

  const shareHandoff = useCallback(async () => {
    if (!handoffText) return;
    setHandoffStatus("idle");
    try {
      await Share.share({ message: handoffText, title: list.name });
    } catch (error) {
      console.error("Couldn't share the shopping list:", error);
      setHandoffStatus("error");
    }
  }, [handoffText, list.name]);

  const copyHandoff = useCallback(async () => {
    if (!handoffText) return;
    setHandoffStatus("idle");
    try {
      await Clipboard.setStringAsync(handoffText);
      setHandoffStatus("copied");
    } catch (error) {
      console.error("Couldn't copy the shopping list:", error);
      setHandoffStatus("error");
    }
  }, [handoffText]);

  const finishWithoutReceipt = useCallback(async () => {
    if (!canFinish) return;
    setIsFinishing(true);
    setFinishError(null);
    try {
      const result = await completeShop(items ?? []);
      analytics.track("shop completed", {
        household_id: householdId,
        item_count_bucket: getItemCountBucket(totalCount),
        total_present: false,
        receipt_present: false,
      });
      if (result.mode === "immediate") {
        router.replace("/(tabs)" as Href);
      } else {
        setCompletionQueued(true);
        finishSheetRef.current?.dismiss();
      }
    } catch (error) {
      console.error("Couldn't finish shop:", error);
      setFinishError("We couldn't save this shop. Your list is still available.");
    } finally {
      setIsFinishing(false);
    }
  }, [
    analytics,
    canFinish,
    completeShop,
    householdId,
    items,
    router,
    totalCount,
  ]);

  if (isLoading) {
    return <ShopLoadingState />;
  }

  if (completionQueued) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-light px-6"
        edges={["top"]}
      >
        <Text className="pt-4 text-4xl font-bold tracking-tight text-ink">
          Shop
        </Text>
        <View className="flex-1 items-center justify-center pb-24">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-teal-soft">
            <Check size={36} color={themeColors.teal} strokeWidth={2.5} />
          </View>
          <Text className="mt-6 text-center text-2xl font-bold text-ink">
            Shop saved
          </Text>
          <Text className="mt-2 max-w-sm text-center text-base leading-6 text-ink-secondary">
            {hasSyncError
              ? "We couldn't sync this shop yet. It's still safely saved on this device."
              : isOnline
                ? "We're finishing the session and updating your household's plan."
                : "We'll finish the session and update your household's plan when you're back online."}
          </Text>
          {hasSyncError ? (
            <Button
              onPress={() => void retrySync()}
              disabled={!isOnline || isProcessing}
              loading={isProcessing}
              className="mt-6"
              accessibilityLabel="Retry syncing the completed shop"
            >
              {isOnline ? "Retry sync" : "Retry when online"}
            </Button>
          ) : isOnline ? (
            <ActivityIndicator
              className="mt-6"
              color={themeColors.coral}
            />
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      <View className="border-b border-separator px-6 pb-4 pt-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-4xl font-bold tracking-tight text-ink">
              Shop
            </Text>
            <Text className="mt-2 text-lg font-semibold text-ink">
              {list.name}
            </Text>
            <Text className="mt-0.5 text-sm text-ink-secondary">
              {list.plannedFor
                ? formatDateWithWeekday(list.plannedFor, {
                    locale,
                    timeZone: planningTimeZone,
                  })
                : "Your focused shopping list"}
            </Text>
          </View>
          <Button
            onPress={() => {
              setFinishError(null);
              finishSheetRef.current?.present();
            }}
            disabled={!canFinish}
            variant="tonal"
            iconOnly
            size="sm"
            accessibilityLabel="Finish shopping"
            accessibilityHint="Opens receipt and finish options"
          >
            <Check
              size={21}
              color={themeColors.coral}
              strokeWidth={2.5}
            />
          </Button>
        </View>

        <View className="mt-5 h-2 overflow-hidden rounded-full bg-warm-gray-200">
          <View
            className="h-full rounded-full bg-teal"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-ink-secondary">
            {completedCount} of {totalCount} picked up
          </Text>
          <Text className="text-sm font-semibold text-ink-secondary">
            {plannedTotalPence > 0
              ? `${formatCurrencyFromPence(plannedTotalPence)} planned`
              : list.tripBudgetPence !== undefined
                ? `${formatCurrencyFromPence(list.tripBudgetPence)} budget`
                : "Prices optional"}
          </Text>
        </View>

        {(isFromCache || !isOnline || queueLength > 0) && (
          <View className="mt-3 flex-row items-start rounded-xl border border-yellow/50 bg-yellow/20 px-3 py-2.5">
            <CloudOff size={17} color={themeColors.warningInk} />
            <Text className="ml-2 flex-1 text-sm leading-5 text-yellow-900">
              {syncMessage}
            </Text>
          </View>
        )}
      </View>

      {shoppingMode === "online" && (
        <View className="mx-6 mt-4 rounded-2xl border border-teal/20 bg-teal-soft p-4">
          <Text className="text-lg font-bold text-ink">Ready to order online</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-secondary">
            Share or copy what is still needed, then paste it into your retailer's
            app or website.
          </Text>
          <View className="mt-4 flex-row gap-2">
            <Button
              variant="secondary"
              size="sm"
              onPress={() => void shareHandoff()}
              disabled={!handoffText}
              className="flex-1"
              accessibilityLabel="Share the remaining shopping list"
            >
              <Share2 size={17} color={themeColors.surface} />
              <Text className="ml-2 text-sm font-semibold text-white">Share list</Text>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => void copyHandoff()}
              disabled={!handoffText}
              className="flex-1 border-teal"
              accessibilityLabel="Copy the remaining shopping list"
            >
              {handoffStatus === "copied" ? (
                <Check size={17} color={themeColors.teal} />
              ) : (
                <Copy size={17} color={themeColors.teal} />
              )}
              <Text className="ml-2 text-sm font-semibold text-teal">
                {handoffStatus === "copied" ? "Copied" : "Copy list"}
              </Text>
            </Button>
          </View>
          {!handoffText && (
            <Text className="mt-3 text-sm text-ink-secondary">
              Add an item, or untick something already picked up, to create a handoff.
            </Text>
          )}
          {handoffStatus === "error" && (
            <Text className="mt-3 text-sm text-red-600">
              We couldn't prepare the handoff. Please try again.
            </Text>
          )}
        </View>
      )}

      <View className="flex-1 px-6 pb-20">
        {totalCount === 0 ? (
          <View className="flex-1 items-center justify-center px-8 pb-20">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
              <ShoppingBasket size={28} color={themeColors.coral} />
            </View>
            <Text className="mt-4 text-center text-2xl font-bold text-ink">
              Add the first thing you need
            </Text>
            <Text className="mt-2 text-center text-base leading-6 text-ink-secondary">
              Type below. Everyone in the household will see it.
            </Text>
          </View>
        ) : (
          <FlashList
            data={items ?? []}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <ListItem
                id={item._id}
                name={item.name}
                quantity={item.quantity}
                unit={item.unit}
                notes={item.notes}
                category={item.category}
                estimatedPricePence={item.estimatedPricePence}
                isCompleted={item.isCompleted}
                addedByUser={item.addedByUser}
                isPendingSync={item.isPendingSync || isPendingSync(item._id)}
                onToggle={(itemId) => void toggleComplete(itemId)}
                onDelete={(itemId) => void removeItem(itemId)}
              />
            )}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
          />
        )}
      </View>
      <AddItemInput onAdd={handleAdd} />

      <GlassBottomSheet
        ref={finishSheetRef}
        snapPoints={["72%"]}
        dismissible={!isFinishing}
      >
        <GlassBottomSheetView className="px-6 pb-10 pt-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-ink">
              Finish this shop
            </Text>
            <Pressable
              onPress={() => finishSheetRef.current?.dismiss()}
              className="h-12 w-12 items-center justify-center rounded-full bg-warm-gray-100"
              accessibilityLabel="Close finish shop options"
              accessibilityRole="button"
            >
              <X size={20} color={themeColors.secondaryInk} />
            </Pressable>
          </View>
          <Text className="mt-2 text-base leading-6 text-ink-secondary">
            {canScanReceipt
              ? "Add what you spent, or skip it for now. Your list stays available until the trip saves."
              : "Adding spend needs a connection. You can finish without it and sync later."}
          </Text>

          <View className="mt-4 flex-row rounded-2xl bg-warm-gray-100 px-4 py-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-ink">{completedCount}</Text>
              <Text className="text-sm text-ink-secondary">
                {completedCount === 1 ? "product purchased" : "products purchased"}
              </Text>
            </View>
            <View className="w-px bg-separator" />
            <View className="flex-1 pl-4">
              <Text className="text-lg font-bold text-ink">
                {Math.max(0, totalCount - completedCount)}
              </Text>
              <Text className="text-sm text-ink-secondary">
                {totalCount - completedCount === 1
                  ? "product left"
                  : "products left"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              finishSheetRef.current?.dismiss();
              router.push(getReceiptCaptureRoute(list._id));
            }}
            disabled={!canScanReceipt}
            className="mt-5 min-h-16 flex-row items-center rounded-xl bg-coral p-4 disabled:opacity-50"
            accessibilityLabel="Scan a receipt"
            accessibilityRole="button"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/20">
              <Camera size={22} color={themeColors.surface} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-white">
                Scan receipt
              </Text>
              <Text className="mt-0.5 text-sm text-white/80">
                Check the total before saving
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              finishSheetRef.current?.dismiss();
              router.push(getManualReceiptEntryRoute(list._id));
            }}
            disabled={!canAddSpend}
            className="mt-3 min-h-16 flex-row items-center rounded-xl border border-separator bg-white/60 p-4 disabled:opacity-50"
            accessibilityLabel="Enter shopping total"
            accessibilityHint="Opens a form to add the total, store, and payment source"
            accessibilityRole="button"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-soft">
              <PoundSterling size={22} color={themeColors.teal} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-ink">Enter total</Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                Add spend without taking a photo
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => void finishWithoutReceipt()}
            disabled={!canFinish}
            className="mt-3 min-h-16 flex-row items-center rounded-xl border border-separator p-4 disabled:opacity-50"
            accessibilityLabel="Finish without a receipt"
            accessibilityRole="button"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-warm-gray-100">
              {isFinishing ? (
                <ActivityIndicator color={themeColors.secondaryInk} />
              ) : (
                <Receipt size={22} color={themeColors.secondaryInk} />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-ink">
                Skip for now
              </Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                Save the trip without financial details
              </Text>
            </View>
          </Pressable>

          <Text className="mt-4 text-sm leading-5 text-ink-secondary">
            We'll use purchased recurring products to prepare the next shop.
          </Text>

          {finishUnavailableMessage && (
            <Text className="mt-3 text-sm text-yellow-800">
              {finishUnavailableMessage}
            </Text>
          )}
          {finishError && (
            <Text className="mt-3 text-sm text-red-600">{finishError}</Text>
          )}
        </GlassBottomSheetView>
      </GlassBottomSheet>
    </SafeAreaView>
  );
}
