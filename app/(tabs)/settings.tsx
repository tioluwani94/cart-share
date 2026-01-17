import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Archive, RotateCcw, ChevronDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Toast } from "@/components/ui";

export default function SettingsScreen() {
  const router = useRouter();
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [restoringListId, setRestoringListId] = useState<Id<"lists"> | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState(false);

  // Get current household
  const household = useQuery(api.households.getCurrentHousehold);

  // Get archived lists
  const archivedLists = useQuery(
    api.lists.getArchivedByHousehold,
    household?._id ? { householdId: household._id } : "skip"
  );

  const unarchiveList = useMutation(api.lists.unarchive);

  // Animation for archived section
  const chevronRotation = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const toggleArchivedSection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExpanded = !archivedExpanded;
    setArchivedExpanded(newExpanded);
    chevronRotation.value = withSpring(newExpanded ? 180 : 0, {
      damping: 15,
      stiffness: 200,
    });
  };

  const handleRestoreList = useCallback(
    async (listId: Id<"lists">) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRestoringListId(listId);
      try {
        await unarchiveList({ listId });
        setShowRestoreToast(true);
      } catch (error) {
        console.error("Failed to restore list:", error);
      } finally {
        setRestoringListId(null);
      }
    },
    [unarchiveList]
  );

  const handleToastDismiss = useCallback(() => {
    setShowRestoreToast(false);
  }, []);

  // Loading state
  if (household === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  const archivedCount = archivedLists?.length ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text className="text-2xl font-bold text-warm-gray-900">Settings</Text>
          <Text className="mt-1 text-warm-gray-600">
            Manage your household and account
          </Text>
        </Animated.View>

        {/* Archived Lists Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          className="mt-8"
        >
          <Pressable
            onPress={toggleArchivedSection}
            className="flex-row items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
            style={{
              shadowColor: "#78716C",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
            }}
            accessibilityRole="button"
            accessibilityLabel={`${archivedExpanded ? "Collapse" : "Expand"} archived lists`}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-warm-gray-100">
                <Archive size={20} color="#78716C" strokeWidth={2} />
              </View>
              <View>
                <Text className="text-base font-semibold text-warm-gray-900">
                  Archived Lists
                </Text>
                <Text className="text-sm text-warm-gray-500">
                  {archivedCount === 0
                    ? "No archived lists"
                    : `${archivedCount} archived ${archivedCount === 1 ? "list" : "lists"}`}
                </Text>
              </View>
            </View>
            <Animated.View style={chevronStyle}>
              <ChevronDown size={20} color="#78716C" strokeWidth={2} />
            </Animated.View>
          </Pressable>

          {/* Archived lists expanded content */}
          {archivedExpanded && (
            <Animated.View
              entering={FadeIn.duration(200)}
              className="mt-3 rounded-2xl bg-white p-4 shadow-sm"
              style={{
                shadowColor: "#78716C",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {archivedLists === undefined ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color="#FF6B6B" />
                </View>
              ) : archivedLists.length === 0 ? (
                <View className="items-center py-4">
                  <Text className="text-4xl">📭</Text>
                  <Text className="mt-2 text-center text-warm-gray-500">
                    No archived lists yet
                  </Text>
                  <Text className="mt-1 text-center text-sm text-warm-gray-400">
                    When you archive a list, it will appear here
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {archivedLists.map((list, index) => (
                    <Animated.View
                      key={list._id}
                      entering={FadeInDown.delay(index * 50).duration(300)}
                      className="flex-row items-center justify-between rounded-xl bg-warm-gray-50 p-3"
                    >
                      <View className="flex-1">
                        <Text
                          className="font-medium text-warm-gray-700"
                          numberOfLines={1}
                        >
                          {list.name}
                        </Text>
                        <Text className="text-sm text-warm-gray-500">
                          {list.totalItems} items
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleRestoreList(list._id)}
                        disabled={restoringListId === list._id}
                        className="ml-3 flex-row items-center gap-2 rounded-xl bg-teal/10 px-3 py-2 active:bg-teal/20"
                        accessibilityLabel={`Restore ${list.name}`}
                        accessibilityRole="button"
                      >
                        {restoringListId === list._id ? (
                          <ActivityIndicator size="small" color="#4ECDC4" />
                        ) : (
                          <>
                            <RotateCcw size={16} color="#4ECDC4" strokeWidth={2} />
                            <Text className="text-sm font-medium text-teal">
                              Restore
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Settings content will be added in US-042 */}
        <View className="mt-8 items-center py-8">
          <Text className="text-5xl">⚙️</Text>
          <Text className="mt-4 text-center text-lg text-warm-gray-600">
            More settings coming soon
          </Text>
        </View>
      </ScrollView>

      {/* Success toast */}
      <Toast
        visible={showRestoreToast}
        message="List restored! ✓"
        onDismiss={handleToastDismiss}
        duration={2000}
      />
    </SafeAreaView>
  );
}
