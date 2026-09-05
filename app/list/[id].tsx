import emptyBasketArtwork from "@/assets/empty-states/empty-basket.png";
import {
  AddItemInput,
  ArchiveConfirmDialog,
  CompletionCelebration,
  EditItemSheet,
  HeaderMenu,
  ListItem,
  type ListItemEditPayload,
  PartnerActivityToast,
} from "@/components/lists";
import {
  AmountInput,
  Button,
  EmptyStateCard,
  GlassBottomSheet,
  GlassBottomSheetView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
  PageHeader,
  ProgressBar,
  usePageHeaderHeight,
  useToast,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCachedList } from "@/lib/useCachedQuery";
import { useShoppingList } from "@/lib/useShoppingList";
import { getReceiptCaptureRoute } from "@/lib/receiptFlow";
import {
  formatCurrencyFromPence,
  parseCurrencyInputToPence,
} from "@/lib/formatters";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import {
  ChevronDown,
  CloudOff,
  PoundSterling,
  SearchX,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
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
  const listId = id as Id<"lists">;
  const { userId } = useAuth();
  const pageHeaderHeight = usePageHeaderHeight();
  const { showToast } = useToast();
  const analytics = useAnalytics();

  const [refreshing, setRefreshing] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const [editingItem, setEditingItem] =
    useState<ListItemEditPayload | null>(null);
  const [openSwipeItemId, setOpenSwipeItemId] =
    useState<Id<"items"> | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [tripBudgetInput, setTripBudgetInput] = useState("");
  const [tripBudgetError, setTripBudgetError] = useState("");
  const [isSavingTripBudget, setIsSavingTripBudget] = useState(false);
  const [partnerActivity, setPartnerActivity] =
    useState<PartnerActivity | null>(null);
  const previousProgressRef = useRef<number | null>(null);
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
    uncompletedItems,
    completedItems,
    totalItems,
    completedCount,
    progress,
    plannedTotalPence,
    addItem: offlineAddItem,
    toggleComplete: offlineToggleComplete,
    removeItem: offlineRemoveItem,
    updateItem: offlineUpdateItem,
    isPendingSync,
  } = useShoppingList(listId, list?.householdId);

  const archiveList = useMutation(api.lists.archive);
  const updateList = useMutation(api.lists.update);

  // Animation for completed section
  const expandedRotation = useSharedValue(completedExpanded ? 0 : -90);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${expandedRotation.value}deg` }],
  }));

  const progressPercent = progress * 100;

  // Detect when list becomes 100% complete
  useEffect(() => {
    // Skip on initial load (when previousProgressRef is null)
    if (previousProgressRef.current === null) {
      previousProgressRef.current = progressPercent;
      return;
    }

    // Trigger celebration when transitioning to 100% from less than 100%
    if (
      progressPercent === 100 &&
      previousProgressRef.current < 100 &&
      totalItems > 0
    ) {
      setShowCelebration(true);
    }

    previousProgressRef.current = progressPercent;
  }, [progressPercent, totalItems]);

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
    if (!partnerActivity || !uncompletedItems) return;

    // Find the index of the new item in the uncompleted items list
    const itemIndex = uncompletedItems.findIndex(
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
  }, [partnerActivity, uncompletedItems]);

  const handleDismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  const handleScanReceipt = useCallback(async () => {
    setShowCelebration(false);
    router.push(getReceiptCaptureRoute(listId));
  }, [listId]);

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
    setShowArchiveDialog(true);
  }, []);

  const handleArchiveConfirm = useCallback(async () => {
    setIsArchiving(true);
    try {
      await archiveList({ listId });
      setShowArchiveDialog(false);
      showToast({ message: "List archived", tone: "success" });
      // Navigate back after showing toast briefly
      setTimeout(() => {
        router.back();
      }, 1500);
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Convex queries auto-refresh, but we simulate a refresh for UX
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const toggleCompletedSection = () => {
    const newExpanded = !completedExpanded;
    setCompletedExpanded(newExpanded);
    expandedRotation.value = withSpring(newExpanded ? 0 : -90, {
      damping: 15,
      stiffness: 200,
    });
  };

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

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["left", "right", "bottom"]}
    >
      <PageHeader
        title={list.name}
        onBack={() => router.back()}
        trailing={<HeaderMenu onArchive={handleArchivePress} />}
      />

      <View
        className="border-b border-separator px-6 pb-4"
        style={{
          paddingTop: pageHeaderHeight + PAGE_HEADER_CONTENT_CLEARANCE,
        }}
      >
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] text-ink-secondary">
              {completedCount} of {totalItems} items
            </Text>
            {progressPercent === 100 && totalItems > 0 && (
              <Animated.View
                entering={FadeIn.duration(300)}
                className="rounded-full bg-teal/20 px-3 py-1"
              >
                <Text className="text-sm font-semibold text-teal">
                  All done!
                </Text>
              </Animated.View>
            )}
          </View>

          <View className="mt-2 flex-row">
            <ProgressBar
              value={completedCount}
              max={totalItems}
              size="compact"
              accessibilityLabel="Shopping progress"
              accessibilityText={`${completedCount} of ${totalItems} items complete`}
            />
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {plannedTotalPence > 0 && (
              <View className="rounded-full bg-teal/10 px-3 py-1.5">
                <Text className="text-sm font-medium text-teal">
                  Planned {formatCurrencyFromPence(plannedTotalPence)}
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleOpenBudgetEditor}
              className="min-h-12 justify-center rounded-full bg-coral/10 px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel={
                list.tripBudgetPence === undefined
                  ? "Set trip budget"
                  : "Edit trip budget"
              }
            >
              <Text className="text-sm font-medium text-coral">
                {list.tripBudgetPence === undefined
                  ? "Set trip budget"
                  : `Budget ${formatCurrencyFromPence(list.tripBudgetPence)}`}
              </Text>
            </Pressable>
          </View>

          {isFromCache && (
            <Animated.View
              entering={FadeIn.duration(300)}
              className="mt-3 flex-row items-center rounded-lg bg-yellow/20 px-3 py-2"
            >
              <CloudOff size={14} color="#CA8A04" strokeWidth={2} />
              <Text className="ml-2 text-xs text-yellow-700">
                Showing cached items (offline)
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Items list */}
      <FlashList
        {...keyboardDismissScrollProps}
        ref={flashListRef}
        data={uncompletedItems}
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
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B6B"
            colors={["#FF6B6B"]}
          />
        }
        onScrollBeginDrag={() => setOpenSwipeItemId(null)}
        ListEmptyComponent={
          completedItems.length === 0 ? (
            <EmptyStateCard
              title="No items yet"
              description="Add the first thing you need for this shop."
              artworkSource={emptyBasketArtwork}
              density="compact"
              className="mt-8"
            />
          ) : null
        }
        ListFooterComponent={
          completedItems.length > 0 ? (
            <View className="mt-4">
              {/* Completed section header */}
              <Pressable
                onPress={toggleCompletedSection}
                className="mb-3 flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel={`${completedExpanded ? "Collapse" : "Expand"} completed items`}
              >
                <Animated.View style={chevronStyle}>
                  <ChevronDown size={20} color="#78716C" strokeWidth={2} />
                </Animated.View>
                <Text className="ml-2 text-base font-semibold text-warm-gray-600">
                  Done! ({completedItems.length})
                </Text>
              </Pressable>

              {/* Completed items */}
              {completedExpanded && (
                <Animated.View entering={FadeIn.duration(200)}>
                  {completedItems.map((item) => (
                    <ListItem
                      key={item._id}
                      id={item._id}
                      name={item.name}
                      quantity={item.quantity}
                      unit={item.unit}
                      notes={item.notes}
                      category={item.category}
                      estimatedPricePence={item.estimatedPricePence}
                      isCompleted={item.isCompleted}
                      addedByUser={item.addedByUser}
                      isPendingSync={
                        item.isPendingSync || isPendingSync(item._id)
                      }
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      isSwipeOpen={openSwipeItemId === item._id}
                      onSwipeOpen={handleSwipeOpen}
                      onSwipeClose={handleSwipeClose}
                    />
                  ))}
                </Animated.View>
              )}
            </View>
          ) : null
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
        <GlassBottomSheetView className="px-6 pb-10 pt-2">
          <GlassSheetHeader
            title="Trip budget"
            description="Set a calm spending guide for this shop. Leave it empty to remove the budget."
            icon={
              <PoundSterling size={21} color="#C94A4A" strokeWidth={2} />
            }
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
        </GlassBottomSheetView>
      </GlassBottomSheet>

      {/* Completion celebration overlay */}
      <CompletionCelebration
        visible={showCelebration}
        onDismiss={handleDismissCelebration}
        onScanReceipt={handleScanReceipt}
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
