import { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ListCard, EmptyListState, CreateListSheet, ArchiveConfirmDialog } from "@/components/lists";
import { Toast } from "@/components/ui";
import { useCachedLists } from "@/lib/useCachedQuery";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import BottomSheet from "@gorhom/bottom-sheet";
import { Plus, CloudOff } from "lucide-react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Get a time-based greeting.
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Get the user's first name or a friendly fallback.
 */
function getFirstName(fullName?: string | null): string {
  if (!fullName) return "there";
  return fullName.split(" ")[0];
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [archiveDialogList, setArchiveDialogList] = useState<{
    id: Id<"lists">;
    name: string;
  } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchiveToast, setShowArchiveToast] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Get current household
  const household = useQuery(api.households.getCurrentHousehold);

  // Get lists for the household (with real-time updates and offline caching)
  const { data: lists, isFromCache, isLoading: listsLoading } = useCachedLists(household?._id);

  const archiveList = useMutation(api.lists.archive);

  // FAB animation
  const fabScale = useSharedValue(1);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.9, { damping: 10, stiffness: 400 });
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1, { damping: 10, stiffness: 400 });
  };

  const handleCreateList = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleSheetClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  const handleListPress = (listId: string) => {
    router.push(`/list/${listId}`);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex queries automatically refresh, so we just need to wait a bit
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleArchiveSwipe = useCallback(
    (listId: Id<"lists">) => {
      const list = lists?.find((l) => l._id === listId);
      if (list) {
        setArchiveDialogList({ id: listId, name: list.name });
      }
    },
    [lists]
  );

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveDialogList) return;
    setIsArchiving(true);
    try {
      await archiveList({ listId: archiveDialogList.id });
      setArchiveDialogList(null);
      setShowArchiveToast(true);
    } catch (error) {
      console.error("Failed to archive list:", error);
    } finally {
      setIsArchiving(false);
    }
  }, [archiveList, archiveDialogList]);

  const handleArchiveCancel = useCallback(() => {
    setArchiveDialogList(null);
  }, []);

  const handleToastDismiss = useCallback(() => {
    setShowArchiveToast(false);
  }, []);

  const greeting = getGreeting();
  const firstName = getFirstName(user?.firstName || user?.fullName);
  const hasLists = lists && lists.length > 0;

  // Loading state
  if (household === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center">
          <View className="h-8 w-8 animate-spin rounded-full border-4 border-coral border-t-transparent" />
          <Text className="mt-4 text-warm-gray-500">Loading your lists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      {/* Header with greeting */}
      <Animated.View entering={FadeIn.duration(500)} className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-warm-gray-900">
          {greeting}, {firstName}!
        </Text>
        <Text className="mt-1 text-warm-gray-600">
          {hasLists
            ? `You have ${lists.length} shopping list${lists.length === 1 ? "" : "s"}`
            : "Ready to start shopping?"}
        </Text>
        {/* Cached data indicator */}
        {isFromCache && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="mt-2 flex-row items-center rounded-lg bg-yellow/20 px-3 py-2"
          >
            <CloudOff size={16} color="#CA8A04" strokeWidth={2} />
            <Text className="ml-2 text-sm text-yellow-700">
              Showing cached data (offline)
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Main content */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B6B"
            colors={["#FF6B6B"]}
          />
        }
      >
        {hasLists ? (
          <View className="pt-4 pb-24">
            {lists.map((list, index) => (
              <ListCard
                key={list._id}
                id={list._id}
                name={list.name}
                category={list.category}
                totalItems={list.totalItems}
                completedItems={list.completedItems}
                onPress={() => handleListPress(list._id)}
                onArchive={handleArchiveSwipe}
                index={index}
              />
            ))}
          </View>
        ) : (
          /* Delightful empty state */
          <EmptyListState onCreateList={handleCreateList} />
        )}
      </ScrollView>

      {/* FAB - Floating Action Button */}
      {hasLists && (
        <AnimatedPressable
          onPress={handleCreateList}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={fabAnimatedStyle}
          accessibilityLabel="Create new list"
          accessibilityRole="button"
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-coral shadow-warm-lg"
        >
          <Plus className="w-4 h-4" color="#FFFFFF" strokeWidth={2.5} />
        </AnimatedPressable>
      )}

      {/* Create List Bottom Sheet */}
      <CreateListSheet ref={bottomSheetRef} onClose={handleSheetClose} />

      {/* Archive confirmation dialog */}
      <ArchiveConfirmDialog
        visible={archiveDialogList !== null}
        listName={archiveDialogList?.name || ""}
        onConfirm={handleArchiveConfirm}
        onCancel={handleArchiveCancel}
        isLoading={isArchiving}
      />

      {/* Success toast */}
      <Toast
        visible={showArchiveToast}
        message="List archived! ✓"
        onDismiss={handleToastDismiss}
        duration={2000}
      />
    </SafeAreaView>
  );
}
