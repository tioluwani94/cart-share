import {
  AddItemInput,
  ArchiveConfirmDialog,
  CompletionCelebration,
  EditItemSheet,
  HeaderMenu,
  ListItem,
  PartnerActivityToast,
} from "@/components/lists";
import { Button, Input, Toast } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCachedList } from "@/lib/useCachedQuery";
import { useShoppingList } from "@/lib/useShoppingList";
import { getReceiptCaptureRoute } from "@/lib/receiptFlow";
import {
  formatCurrencyFromPence,
  parseCurrencyInputToPence,
} from "@/lib/formatters";
import BottomSheet from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronLeft, CloudOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
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

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = id as Id<"lists">;
  const { userId } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const [editingItem, setEditingItem] = useState<{
    id: Id<"items">;
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    category?: string;
    estimatedPricePence?: number;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
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
  const editSheetRef = useRef<BottomSheet>(null);

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
      if (newItem.addedByUser && newItem.addedByUser._id !== currentUser._id) {
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
    },
    [offlineAddItem],
  );

  const handleDelete = useCallback(
    async (itemId: Id<"items">) => {
      try {
        await offlineRemoveItem(itemId);
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    },
    [offlineRemoveItem],
  );

  const handleEdit = useCallback(
    (item: {
      id: Id<"items">;
      name: string;
      quantity?: number;
      unit?: string;
      notes?: string;
      category?: string;
      estimatedPricePence?: number;
    }) => {
      setEditingItem(item);
      editSheetRef.current?.snapToIndex(0);
    },
    [],
  );

  const handleEditClose = useCallback(() => {
    setEditingItem(null);
  }, []);

  const handleArchivePress = useCallback(() => {
    setShowArchiveDialog(true);
  }, []);

  const handleArchiveConfirm = useCallback(async () => {
    setIsArchiving(true);
    try {
      await archiveList({ listId });
      setShowArchiveDialog(false);
      setShowArchiveToast(true);
      // Navigate back after showing toast briefly
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Failed to archive list:", error);
      setIsArchiving(false);
    }
  }, [archiveList, listId]);

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
    setShowBudgetEditor(true);
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
      setShowBudgetEditor(false);
    } catch (error) {
      console.error("Failed to update trip budget:", error);
      setTripBudgetError("Couldn't save the budget. Please try again.");
    } finally {
      setIsSavingTripBudget(false);
    }
  }, [listId, tripBudgetInput, updateList]);

  const handleToastDismiss = useCallback(() => {
    setShowArchiveToast(false);
  }, []);

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
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text className="mt-4 text-warm-gray-500">Loading list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // List not found
  if (list === null) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl">🔍</Text>
          <Text className="mt-4 text-center text-xl font-semibold text-warm-gray-800">
            List not found
          </Text>
          <Text className="mt-2 text-center text-warm-gray-600">
            This list may have been deleted or you don't have access to it.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-full bg-coral px-6 py-3"
          >
            <Text className="font-semibold text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Category emoji mapping
  const categoryEmojis: Record<string, string> = {
    groceries: "🛒",
    tesco: "🛍️",
    sainsburys: "🧺",
    pharmacy: "💊",
    other: "📝",
  };
  const categoryEmoji =
    categoryEmojis[list.category?.toLowerCase() || "other"] || "🛒";

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="border-b border-warm-gray-100 bg-white px-4 pb-4 pt-2"
      >
        {/* Back button and title row */}
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-3 flex-1"
            accessibilityLabel="Go back"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-warm-gray-100">
              <ChevronLeft size={24} color="#57534E" strokeWidth={2} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="mr-2 text-2xl">{categoryEmoji}</Text>
                <Text
                  className="flex-1 text-2xl font-bold text-warm-gray-900"
                  numberOfLines={1}
                >
                  {list.name}
                </Text>
              </View>
            </View>
          </Pressable>
          <HeaderMenu onArchive={handleArchivePress} />
        </View>

        {/* Progress summary */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-warm-gray-600">
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

          {/* Progress bar */}
          <View className="mt-2 h-3 overflow-hidden rounded-full bg-warm-gray-200">
            <Animated.View
              className="h-full rounded-full bg-teal"
              style={{ width: `${progressPercent}%` }}
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

          {/* Cached data indicator */}
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
      </Animated.View>

      {/* Items list */}
      <FlashList
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
        ListEmptyComponent={
          completedItems.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-5xl">📝</Text>
              <Text className="mt-4 text-center text-lg font-medium text-warm-gray-600">
                No items yet
              </Text>
              <Text className="mt-1 text-center text-warm-gray-500">
                Add some items to get started!
              </Text>
            </View>
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

      <Modal
        visible={showBudgetEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBudgetEditor(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/30 px-6">
          <View className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">
            <Text className="text-xl font-bold text-warm-gray-900">
              Trip budget
            </Text>
            <Text className="mb-5 mt-1 text-warm-gray-500">
              Leave this empty to remove the budget.
            </Text>
            <Input
              label="Budget in pounds"
              value={tripBudgetInput}
              onChangeText={(value) => {
                setTripBudgetInput(value);
                setTripBudgetError("");
              }}
              error={tripBudgetError}
              placeholder="e.g. £60"
              keyboardType="decimal-pad"
            />
            <View className="mt-2 flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => setShowBudgetEditor(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onPress={handleSaveTripBudget}
                loading={isSavingTripBudget}
              >
                Save
              </Button>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* Success toast */}
      <Toast
        visible={showArchiveToast}
        message="List archived! ✓"
        onDismiss={handleToastDismiss}
        duration={1500}
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
