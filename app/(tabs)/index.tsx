import { View, Text, Pressable, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListCard } from "@/components/lists";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { useState, useCallback } from "react";

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

  // Get current household
  const household = useQuery(api.households.getCurrentHousehold);

  // Get lists for the household (with real-time updates)
  const lists = useQuery(
    api.lists.getByHousehold,
    household?._id ? { householdId: household._id } : "skip"
  );

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

  const handleCreateList = () => {
    // Navigate to create list sheet (will be implemented in US-014)
    router.push("/create-list");
  };

  const handleListPress = (listId: string) => {
    router.push(`/list/${listId}`);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex queries automatically refresh, so we just need to wait a bit
    setTimeout(() => setRefreshing(false), 500);
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

  // No household state - shouldn't happen if routing is correct
  if (household === null) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl">🏠</Text>
          <Text className="mt-4 text-center text-lg text-warm-gray-600">
            You haven't set up a household yet
          </Text>
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
                index={index}
              />
            ))}
          </View>
        ) : (
          /* Empty state */
          <Animated.View
            entering={FadeIn.delay(200).duration(500)}
            className="flex-1 items-center justify-center pt-20"
          >
            <Text className="text-6xl">🛒</Text>
            <Text className="mt-4 text-center text-xl font-semibold text-warm-gray-900">
              Your lists are feeling lonely!
            </Text>
            <Text className="mt-2 text-center text-warm-gray-500">
              Tap the + button to create your first list
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* FAB - Floating Action Button */}
      <AnimatedPressable
        onPress={handleCreateList}
        onPressIn={handleFabPressIn}
        onPressOut={handleFabPressOut}
        style={fabAnimatedStyle}
        accessibilityLabel="Create new list"
        accessibilityRole="button"
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-coral shadow-warm-lg"
      >
        <Text className="text-2xl font-light text-white">+</Text>
      </AnimatedPressable>
    </SafeAreaView>
  );
}
