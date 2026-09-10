import { FinishShopSheet } from "@/components/lists/FinishShopSheet";
import { ShoppingListSummary } from "@/components/lists/ShoppingListSummary";
import { canFinishShoppingList } from "@/lib/shoppingList";
import emptyBasketArtwork from "@/assets/empty-states/empty-basket.png";
import {
  AddItemInput,
  ArchiveConfirmDialog,
  EditItemSheet,
  ListItem,
  type ListItemEditPayload,
  PartnerActivityToast,
} from "@/components/lists";
import {
  AmountInput,
  Button,
  EmptyStateCard,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
  PageHeader,
  usePageHeaderHeight,
  useToast,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCachedList } from "@/lib/useCachedQuery";
import { useShoppingList } from "@/lib/useShoppingList";
import {
  formatCurrencyFromPence,
  parseCurrencyInputToPence,
} from "@/lib/formatters";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { themeColors } from "@/lib/theme";
import { getItemCountBucket } from "@/lib/analytics";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import {
  Archive,
  Check,
  CloudOff,
  PoundSterling,
  SearchX,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Type for partner activity toast state
interface PartnerActivity {
  itemId: Id<"items">;
  itemName: string;
  partnerName: string;
  partnerImageUrl?: string;
}

// The page header's progressive blur feathers 16pt into the content. Keep
// summary text beyond that material so the first line remains fully legible.
const PAGE_HEADER_CONTENT_CLEARANCE = 24;

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShoppingListDetail key={id} listId={id as Id<"lists">} />;
}

function ShoppingListDetail({ listId }: { listId: Id<"lists"> }) {
  const { userId } = useAuth();
  const pageHeaderHeight = usePageHeaderHeight();
  const { showToast } = useToast();
  const analytics = useAnalytics();

  const [editingItem, setEditingItem] = useState<ListItemEditPayload | null>(
    null,
  );
  const [openSwipeItemId, setOpenSwipeItemId] = useState<Id<"items"> | null>(
    null,
  );
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [tripBudgetInput, setTripBudgetInput] = useState("");
  const [tripBudgetError, setTripBudgetError] = useState("");
  const [isSavingTripBudget, setIsSavingTripBudget] = useState(false);
  const [partnerActivity, setPartnerActivity] =
    useState<PartnerActivity | null>(null);
  const previousItemIdsRef = useRef<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flashListRef = useRef<any>(null);

  // Ref for edit item bottom sheet
  const editSheetRef = useRef<GlassBottomSheetRef>(null);
  const budgetSheetRef = useRef<GlassBottomSheetRef>(null);

  // Fetch list, items (with caching), and current user
  const { data: list } = useCachedList(listId, userId);
  const currentUser = useQuery(api.users.getCurrentUser);

  const {
    items,
    isFromCache,
    isLoading: itemsLoading,
    totalItems,
    completedCount,
    plannedTotalPence,
    addItem: offlineAddItem,
    toggleComplete: offlineToggleComplete,
    removeItem: offlineRemoveItem,
    updateItem: offlineUpdateItem,
    isPendingSync,
    isOnline,
    queueLength,
    hasQueuedCompletion,
    completeShop,
    hasSyncError,
    isProcessing,
    retrySync,
  } = useShoppingList(listId, list?.householdId);

  const archiveList = useMutation(api.lists.archive);
  const updateList = useMutation(api.lists.update);

  const finishSheetRef = useRef<GlassBottomSheetRef>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishingRef = useRef(false);
  const [completionQueued, setCompletionQueued] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const canFinish = canFinishShoppingList({
    totalItems,
    isFinishing,
    hasQueuedCompletion,
  });
  const canScanReceipt =
    canFinish && isOnline && queueLength === 0 && !hasQueuedCompletion;
  const finishWithoutReceipt = async () => {
    if (!canFinish || finishingRef.current || !list) return;
    finishingRef.current = true;
    setIsFinishing(true);
    setFinishError(null);
    try {
      const result = await completeShop(items ?? []);
      analytics.track("shop completed", {
        household_id: list.householdId,
        item_count_bucket: getItemCountBucket(totalItems),
        total_present: false,
        receipt_present: false,
      });
      finishSheetRef.current?.dismiss();
      if (result.mode === "immediate") {
        showToast({ message: "Shop saved", tone: "success" });
        router.replace("/(tabs)");
      } else {
        setCompletionQueued(true);
      }
    } catch (error) {
      console.error("Couldn't finish shop:", error);
      setFinishError(
        "We couldn't save this shop. Your list is still available.",
      );
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
    }
  };

  // Detect when partner adds an item (for partner activity toast)
  useEffect(() => {
    if (!items || !currentUser) return;

    const currentItemIds = new Set(items.map((item) => item._id));

    // Find new items that weren't in the previous list
    const newItems = items.filter(
      (item) => !previousItemIdsRef.current.has(item._id),
    );

    // Check if any new item was added by someone other than the current user
    for (const newItem of newItems) {
      if (
        newItem.addedByUser?._id &&
        newItem.addedByUser._id !== currentUser._id
      ) {
        // Partner added this item!
        setPartnerActivity({
          itemId: newItem._id,
          itemName: newItem.name,
          partnerName: newItem.addedByUser.name || "Partner",
          partnerImageUrl: newItem.addedByUser.imageUrl,
        });
        break; // Only show one toast at a time
      }
    }

    // Update the ref with current item IDs
    previousItemIdsRef.current = currentItemIds;
  }, [items, currentUser]);

  const handleDismissPartnerToast = useCallback(() => {
    setPartnerActivity(null);
  }, []);

  const handlePartnerToastPress = useCallback(() => {
    if (!partnerActivity || !items) return;

    // Find the index of the new item in the displayed list
    const itemIndex = items.findIndex(
      (item) => item._id === partnerActivity.itemId,
    );

    if (itemIndex !== -1 && flashListRef.current) {
      // Scroll to the item
      flashListRef.current.scrollToIndex({
        index: itemIndex,
        animated: true,
        viewPosition: 0.5, // Center the item in view
      });
    }

    setPartnerActivity(null);
  }, [partnerActivity, items]);

  const handleToggle = useCallback(
    async (itemId: Id<"items">) => {
      setOpenSwipeItemId(null);
      try {
        await offlineToggleComplete(itemId);
      } catch (error) {
        console.error("Failed to toggle item:", error);
      }
    },
    [offlineToggleComplete],
  );

  const handleAddItem = useCallback(
    async (name: string) => {
      await offlineAddItem(name);
      analytics.track("shopping item added", {
        household_id: list?.householdId,
        source: "list_detail",
      });
    },
    [analytics, list?.householdId, offlineAddItem],
  );

  const handleDelete = useCallback(
    async (itemId: Id<"items">) => {
      try {
        await offlineRemoveItem(itemId);
      } catch (error) {
        console.error("Failed to delete item:", error);
        throw error;
      }
    },
    [offlineRemoveItem],
  );

  const handleEdit = useCallback((item: ListItemEditPayload) => {
    setEditingItem(item);
    editSheetRef.current?.present();
  }, []);

  const handleEditClose = useCallback(() => {
    setEditingItem(null);
  }, []);
  const handleSwipeOpen = useCallback((itemId: Id<"items">) => {
    setOpenSwipeItemId(itemId);
  }, []);
  const handleSwipeClose = useCallback((itemId: Id<"items">) => {
    setOpenSwipeItemId((currentItemId) =>
      currentItemId === itemId ? null : currentItemId,
    );
  }, []);

  const handleArchivePress = useCallback(() => {
    Keyboard.dismiss();
    setShowArchiveDialog(true);
  }, []);

  const handleArchiveConfirm = useCallback(async () => {
    setIsArchiving(true);
    try {
      await archiveList({ listId });
      setShowArchiveDialog(false);
      showToast({ message: "List archived", tone: "success" });
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } catch (error) {
      console.error("Failed to archive list:", error);
      setIsArchiving(false);
    }
  }, [archiveList, listId, showToast]);

  const handleArchiveCancel = useCallback(() => {
    setShowArchiveDialog(false);
  }, []);

  const handleOpenBudgetEditor = useCallback(() => {
    setTripBudgetInput(
      list?.tripBudgetPence === undefined
        ? ""
        : (list.tripBudgetPence / 100).toFixed(2),
    );
    setTripBudgetError("");
    requestAnimationFrame(() => budgetSheetRef.current?.present());
  }, [list?.tripBudgetPence]);

  const handleSaveTripBudget = useCallback(async () => {
    const budgetPence = tripBudgetInput.trim()
      ? parseCurrencyInputToPence(tripBudgetInput)
      : null;
    if (tripBudgetInput.trim() && budgetPence === null) {
      setTripBudgetError("Enter a valid amount");
      return;
    }

    setTripBudgetError("");
    setIsSavingTripBudget(true);
    try {
      await updateList({ listId, tripBudgetPence: budgetPence });
      budgetSheetRef.current?.dismiss();
    } catch (error) {
      console.error("Failed to update trip budget:", error);
      setTripBudgetError("Couldn't save the budget. Please try again.");
    } finally {
      setIsSavingTripBudget(false);
    }
  }, [listId, tripBudgetInput, updateList]);

  // Loading state (only show if we don't have any data - cached or fresh)
  if (list === undefined || (items === undefined && itemsLoading)) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-light"
        edges={["left", "right", "bottom"]}
      >
        <PageHeader title="Shopping list" onBack={() => router.back()} />
        <View
          className="flex-1 items-center justify-center"
          style={{ paddingTop: pageHeaderHeight }}
        >
          <ActivityIndicator size="large" color="#C94A4A" />
          <Text className="mt-4 text-ink-secondary">Loading list…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // List not found
  if (list === null) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-light"
        edges={["left", "right", "bottom"]}
      >
        <PageHeader title="Shopping list" onBack={() => router.back()} />
        <View className="flex-1" style={{ paddingTop: pageHeaderHeight }}>
          <EmptyStateCard
            title="List not found"
            description="This list may have been deleted, or it may belong to another household."
            icon={<SearchX size={30} color="#C94A4A" strokeWidth={2} />}
            actionLabel="Go back"
            onAction={() => router.back()}
            variant="embedded"
            className="flex-1 justify-center pb-10"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (completionQueued || hasQueuedCompletion) {
    return (
      <SafeAreaView
        className="flex-1 bg-background-light"
        edges={["left", "right", "bottom"]}
      >
        <PageHeader
          title="Shopping list"
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
        />
        <View
          className="flex-1 justify-center px-6"
          style={{ paddingTop: pageHeaderHeight }}
        >
          <EmptyStateCard
            title="Shop saved"
            description={
              hasSyncError
                ? "We couldn't sync this shop yet. It's still safely saved on this device."
                : "Your shop is saved on this device and will sync when you're connected."
            }
          />
          {hasSyncError && (
            <Button
              className="mt-4"
              onPress={() => void retrySync()}
              disabled={!isOnline || isProcessing}
              loading={isProcessing}
            >
              Retry sync
            </Button>
          )}
          <Button className="mt-4" onPress={() => router.replace("/(tabs)")}>
            Go to Plan
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["left", "right", "bottom"]}
    >
      <PageHeader
        title="Shopping list"
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
        trailing={
          <Button
            onPress={() => {
              setFinishError(null);
              finishSheetRef.current?.present();
            }}
            disabled={!canFinish || completionQueued}
            variant="tonal"
            size="sm"
            iconOnly
            accessibilityLabel="Finish shopping"
            accessibilityHint="Opens receipt and finish options"
          >
            <Check size={21} color={themeColors.coral} strokeWidth={2.5} />
          </Button>
        }
      />

      {/* Items list */}
      <FlashList
        {...keyboardDismissScrollProps}
        ref={flashListRef}
        data={items ?? []}
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
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={handleEdit}
            isSwipeOpen={openSwipeItemId === item._id}
            onSwipeOpen={handleSwipeOpen}
            onSwipeClose={handleSwipeClose}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: pageHeaderHeight + PAGE_HEADER_CONTENT_CLEARANCE,
          paddingBottom: 120,
        }}
        onScrollBeginDrag={() => setOpenSwipeItemId(null)}
        ListHeaderComponent={
          <View className="pb-4">
            <ShoppingListSummary
              title={list.name}
              description="Your focused shopping list"
              completedCount={completedCount}
              totalCount={totalItems}
              plannedTotalPence={plannedTotalPence}
              tripBudgetPence={list.tripBudgetPence}
            />
            <View className="mt-4 flex-row gap-2">
              <Button
                variant="tonal"
                size="sm"
                onPress={handleOpenBudgetEditor}
                accessibilityLabel="Edit trip budget"
              >
                {list.tripBudgetPence === undefined
                  ? "Set trip budget"
                  : `Budget ${formatCurrencyFromPence(list.tripBudgetPence)}`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={handleArchivePress}
                disabled={!isOnline || isArchiving || hasQueuedCompletion}
                accessibilityLabel="Archive list"
              >
                <Archive size={18} color={themeColors.secondaryInk} />
                <Text className="ml-2 text-sm text-ink-secondary">Archive</Text>
              </Button>
            </View>
            {(isFromCache || !isOnline || queueLength > 0) && (
              <View className="mt-3 flex-row items-start rounded-xl border border-yellow/50 bg-yellow/20 px-3 py-2.5">
                <CloudOff size={17} color={themeColors.warningInk} />
                <Text className="ml-2 flex-1 text-sm leading-5 text-yellow-900">
                  {!isOnline
                    ? "Offline changes are saved on this device. You can finish now and sync later."
                    : "Showing saved items while your changes sync."}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyStateCard
            title="Add the first thing you need"
            description="Type below. Everyone in the household will see it."
            artworkSource={emptyBasketArtwork}
            density="compact"
            className="mt-8"
          />
        }
      />

      {/* Sticky add item input */}
      <AddItemInput onAdd={handleAddItem} />

      {/* Edit item bottom sheet */}
      <EditItemSheet
        ref={editSheetRef}
        item={editingItem}
        onClose={handleEditClose}
        onUpdate={offlineUpdateItem}
        onDelete={offlineRemoveItem}
      />

      <GlassBottomSheet
        ref={budgetSheetRef}
        snapPoints={["44%"]}
        dismissible={!isSavingTripBudget}
      >
        <GlassBottomSheetScrollView className="px-6 pb-10 pt-2">
          <GlassSheetHeader
            title="Trip budget"
            description="Set a calm spending guide for this shop. Leave it empty to remove the budget."
            icon={<PoundSterling size={21} color="#C94A4A" strokeWidth={2} />}
            onClose={() => budgetSheetRef.current?.dismiss()}
            closeAccessibilityLabel="Close trip budget"
            closeDisabled={isSavingTripBudget}
          />
          <AmountInput
            label="Budget in pounds"
            value={tripBudgetInput}
            onChangeText={(value) => {
              setTripBudgetInput(value);
              setTripBudgetError("");
            }}
            error={tripBudgetError}
            placeholder="e.g. 60"
          />
          <Button
            className="mt-2 w-full"
            onPress={handleSaveTripBudget}
            loading={isSavingTripBudget}
          >
            Save budget
          </Button>
        </GlassBottomSheetScrollView>
      </GlassBottomSheet>

      <FinishShopSheet
        ref={finishSheetRef}
        listId={listId}
        completedCount={completedCount}
        totalCount={totalItems}
        canFinish={canFinish}
        canScanReceipt={canScanReceipt}
        isFinishing={isFinishing}
        finishUnavailableMessage={
          hasQueuedCompletion
            ? "This shop is already waiting to sync."
            : totalItems === 0
              ? "Add at least one item before finishing this shop."
              : null
        }
        finishError={finishError}
        onClose={() => finishSheetRef.current?.dismiss()}
        onFinishWithoutReceipt={finishWithoutReceipt}
      />

      {/* Archive confirmation dialog */}
      <ArchiveConfirmDialog
        visible={showArchiveDialog}
        listName={list?.name || ""}
        onConfirm={handleArchiveConfirm}
        onCancel={handleArchiveCancel}
        isLoading={isArchiving}
      />

      {/* Partner activity toast */}
      <PartnerActivityToast
        visible={partnerActivity !== null}
        partnerName={partnerActivity?.partnerName || ""}
        partnerImageUrl={partnerActivity?.partnerImageUrl}
        itemName={partnerActivity?.itemName || ""}
        onDismiss={handleDismissPartnerToast}
        onPress={handlePartnerToastPress}
        duration={3000}
      />
    </SafeAreaView>
  );
}
