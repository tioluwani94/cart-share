import { Button, Toast, UserAvatar } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/clerk-expo";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import {
  Archive,
  Check,
  ChevronDown,
  Copy,
  Home,
  LogOut,
  RotateCcw,
  Users,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [restoringListId, setRestoringListId] = useState<Id<"lists"> | null>(
    null,
  );
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Clerk auth
  const { signOut } = useAuth();

  // Get current household
  const household = useQuery(api.households.getCurrentHousehold);

  // Animation for copy button
  const copyScale = useSharedValue(1);

  // Get archived lists
  const archivedLists = useQuery(
    api.lists.getArchivedByHousehold,
    household?._id ? { householdId: household._id } : "skip",
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
      damping: 100,
      // stiffness: 200,
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
    [unarchiveList],
  );

  const handleToastDismiss = useCallback(() => {
    setShowRestoreToast(false);
  }, []);

  // Copy invite code handler
  const handleCopyInviteCode = useCallback(async () => {
    if (!household?.inviteCode) return;

    try {
      await Clipboard.setStringAsync(household.inviteCode);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Animate the button
      copyScale.value = withSequence(
        withTiming(0.9, { duration: 50 }),
        withSpring(1.1, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 400 }),
      );

      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [household?.inviteCode, copyScale]);

  const copyButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: copyScale.value }],
  }));

  // Sign out handlers
  const handleSignOutPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSignOutConfirm(true);
  }, []);

  const handleSignOutCancel = useCallback(() => {
    setShowSignOutConfirm(false);
  }, []);

  const handleSignOutConfirm = useCallback(async () => {
    setIsSigningOut(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signOut();
      // User will be redirected to auth screen automatically
    } catch (error) {
      console.error("Sign out failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  }, [signOut]);

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
          <Text className="text-2xl font-bold text-warm-gray-900">
            Settings
          </Text>
          <Text className="mt-1 text-warm-gray-600">
            Manage your household and account
          </Text>
        </Animated.View>

        {/* Archived Lists Section */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          className="mt-4"
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
                            <RotateCcw
                              size={16}
                              color="#4ECDC4"
                              strokeWidth={2}
                            />
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

        {/* Household Section */}
        {household && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            className="mt-6"
          >
            {/* Household Name Card */}
            <View
              className="rounded-2xl bg-white p-5"
              style={{
                shadowColor: "#78716C",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {/* Household Icon and Name */}
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-coral/10">
                  <Home size={24} color="#FF6B6B" strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium uppercase tracking-wide text-warm-gray-500">
                    Your Household
                  </Text>
                  <Text className="text-xl font-bold text-warm-gray-900">
                    {household.name}
                  </Text>
                </View>
              </View>

              {/* Partner Avatars */}
              <View className="mt-5 border-t border-warm-gray-100 pt-5">
                <View className="flex-row items-center gap-2">
                  <Users size={16} color="#78716C" strokeWidth={2} />
                  <Text className="text-sm font-medium text-warm-gray-600">
                    Members
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-3 -mx-4"
                  contentContainerClassName="flex-row items-center gap-4 px-4"
                >
                  {household.members.map((member) => (
                    <View
                      key={member._id}
                      className="flex-row items-center gap-3 rounded-xl bg-warm-gray-50 px-4 py-3"
                    >
                      <UserAvatar
                        name={member.user?.name || "User"}
                        imageUrl={member.user?.imageUrl}
                        size={40}
                        showTooltip={false}
                      />
                      <View>
                        <Text className="font-semibold text-warm-gray-900">
                          {member.user?.name || "Unknown"}
                        </Text>
                        <Text className="text-xs text-warm-gray-500">
                          {member.role === "owner" ? "Owner" : "Member"}
                        </Text>
                      </View>
                    </View>
                  ))}

                  {/* Empty slot if only one member */}
                  {household.members.length === 1 && (
                    <View className="flex-row items-center gap-3 rounded-xl border-2 border-dashed border-warm-gray-200 bg-warm-gray-50/50 px-4 py-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-warm-gray-100">
                        <Text className="text-lg">💑</Text>
                      </View>
                      <View>
                        <Text className="font-medium text-warm-gray-400">
                          Invite your partner!
                        </Text>
                        <Text className="text-xs text-warm-gray-400">
                          Share the code below
                        </Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Invite Code Card */}
        {household && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="mt-4"
          >
            <Pressable
              onPress={handleCopyInviteCode}
              className="rounded-2xl bg-white p-5 active:bg-warm-gray-50"
              style={{
                shadowColor: "#78716C",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
              accessibilityLabel={`Copy invite code ${household.inviteCode}`}
              accessibilityRole="button"
              accessibilityHint="Tap to copy the invite code to clipboard"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-warm-gray-600">
                    Invite Code
                  </Text>
                  <Text
                    className="mt-1 font-mono text-2xl font-bold tracking-widest text-coral"
                    accessibilityLabel={`Invite code: ${household.inviteCode
                      .split("")
                      .join(" ")}`}
                  >
                    {household.inviteCode}
                  </Text>
                  <Text className="mt-2 text-xs text-warm-gray-500">
                    Share this code with your partner to join
                  </Text>
                </View>

                <Animated.View
                  style={copyButtonStyle}
                  className="h-12 w-12 items-center justify-center rounded-full bg-coral/10"
                >
                  {codeCopied ? (
                    <Check size={24} color="#4ECDC4" strokeWidth={2.5} />
                  ) : (
                    <Copy size={22} color="#FF6B6B" strokeWidth={2} />
                  )}
                </Animated.View>
              </View>

              {codeCopied && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(200)}
                  className="mt-3 items-center"
                >
                  <Text className="font-medium text-teal">Copied! ✓</Text>
                </Animated.View>
              )}
            </Pressable>
          </Animated.View>
        )}

        {/* Sign Out Button */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          className="mb-8 mt-8"
        >
          <Button
            variant="outline"
            size="lg"
            onPress={handleSignOutPress}
            className="border-warm-gray-300"
            accessibilityLabel="Sign out of your account"
          >
            <View className="flex-row items-center gap-2">
              <LogOut size={20} color="#78716C" strokeWidth={2} />
              <Text className="font-semibold text-warm-gray-700">Sign Out</Text>
            </View>
          </Button>
        </Animated.View>

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleSignOutCancel}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={handleSignOutCancel}
        >
          <Pressable onPress={() => {}}>
            <Animated.View
              entering={FadeIn.duration(200)}
              className="mx-6 w-80 rounded-3xl bg-white p-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
                elevation: 8,
              }}
            >
              {/* Goodbye emoji */}
              <View className="mb-4 items-center">
                <Text className="text-5xl">👋</Text>
              </View>

              <Text className="text-center text-xl font-bold text-warm-gray-900">
                See you soon!
              </Text>
              <Text className="mt-2 text-center text-warm-gray-600">
                Are you sure you want to sign out?
              </Text>

              <View className="mt-6 gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onPress={handleSignOutConfirm}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="font-semibold text-white">
                      Yes, sign out
                    </Text>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onPress={handleSignOutCancel}
                  disabled={isSigningOut}
                >
                  <Text className="font-semibold text-warm-gray-600">
                    Stay signed in
                  </Text>
                </Button>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

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
