import {
  Button,
  GlassSegmentedControl,
  Input,
  PageHeader,
  Toast,
  UserAvatar,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { parseCurrencyInputToPence } from "@/lib/formatters";
import {
  getCurrentDeviceId,
  registerForPushNotifications,
} from "@/lib/pushNotifications";
import { themeColors } from "@/lib/theme";
import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Archive,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  Copy,
  Home,
  LogOut,
  PiggyBank,
  RotateCcw,
  UserPlus,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const REMINDER_TIME_OPTIONS = [9 * 60, 13 * 60, 18 * 60] as const;

function formatReminderTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function SettingsLoadingState({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      <PageHeader title="Settings" onBack={onBack} />
      <View className="px-6 pt-5">
        <View className="h-5 w-24 rounded-lg bg-warm-gray-100" />
        <View className="mt-3 h-48 rounded-2xl border border-separator bg-surface" />
      </View>
    </SafeAreaView>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [restoringListId, setRestoringListId] = useState<Id<"lists"> | null>(
    null,
  );
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [showBudgetToast, setShowBudgetToast] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [notificationTimeMinutes, setNotificationTimeMinutes] = useState(
    18 * 60,
  );
  const { signOut } = useAuth();
  const analytics = useAnalytics();
  const household = useQuery(api.households.getCurrentHousehold);
  const preferences = useQuery(api.notifications.getPreferences);
  const archivedLists = useQuery(
    api.lists.getArchivedByHousehold,
    household?._id ? { householdId: household._id } : "skip",
  );
  const unarchiveList = useMutation(api.lists.unarchive);
  const saveMonthlyBudget = useMutation(api.households.setMonthlyBudget);
  const disablePushDevices = useMutation(api.notifications.disableAllDevices);
  const disablePushDevice = useMutation(api.notifications.disableDevice);
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  const registerDevice = useMutation(api.notifications.registerDevice);
  const recalculateReminders = useMutation(
    api.notifications.recalculateForHousehold,
  );

  useEffect(() => {
    if (household?.monthlyBudgetPence !== undefined) {
      setMonthlyBudget((household.monthlyBudgetPence / 100).toFixed(2));
    }
  }, [household?.monthlyBudgetPence]);

  useEffect(() => {
    if (preferences?.notificationTimeMinutesLocal !== undefined) {
      setNotificationTimeMinutes(preferences.notificationTimeMinutesLocal);
    }
  }, [preferences?.notificationTimeMinutesLocal]);

  const reminderTimeOptions = useMemo(() => {
    const minutes = new Set<number>(REMINDER_TIME_OPTIONS);
    minutes.add(notificationTimeMinutes);
    return [...minutes]
      .sort((left, right) => left - right)
      .map((value) => ({
        value: String(value),
        label: formatReminderTime(value),
        accessibilityLabel: `Send reminders at ${formatReminderTime(value)}`,
      }));
  }, [notificationTimeMinutes]);

  const toggleArchivedSection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setArchivedExpanded((expanded) => !expanded);
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

  const handleCopyInviteCode = useCallback(async () => {
    if (!household?.inviteCode) return;
    try {
      await Clipboard.setStringAsync(household.inviteCode);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [household?.inviteCode]);

  const handleSaveBudget = useCallback(async () => {
    const budgetPence = monthlyBudget.trim()
      ? parseCurrencyInputToPence(monthlyBudget)
      : undefined;
    if (monthlyBudget.trim() && budgetPence === null) {
      setBudgetError("Enter a valid amount");
      return;
    }

    setBudgetError("");
    setIsSavingBudget(true);
    try {
      await saveMonthlyBudget({
        monthlyBudgetPence: budgetPence ?? undefined,
      });
      setShowBudgetToast(true);
    } catch (error) {
      console.error("Failed to save monthly budget:", error);
      setBudgetError("Couldn't save the budget. Please try again.");
    } finally {
      setIsSavingBudget(false);
    }
  }, [monthlyBudget, saveMonthlyBudget]);

  const handleNotificationChange = useCallback(
    async (enabled: boolean) => {
      setIsSavingPreferences(true);
      setPreferenceError(null);
      try {
        if (!enabled) {
          await updatePreferences({ restockNotificationsEnabled: false });
          return;
        }
        const registration = await registerForPushNotifications();
        if (registration.status !== "granted") {
          analytics.track("notification permission answered", {
            answer: "denied",
            household_id: household?._id,
          });
          setPreferenceError(
            registration.reason ??
              "Notifications are turned off for Our Pantry in device settings.",
          );
          return;
        }
        await registerDevice({
          token: registration.token,
          platform: registration.platform,
          deviceId: registration.deviceId,
        });
        await updatePreferences({ restockNotificationsEnabled: true });
        await recalculateReminders({});
        analytics.track("notification permission answered", {
          answer: "granted",
          household_id: household?._id,
        });
      } catch (error) {
        console.error("Couldn't update notification preferences:", error);
        setPreferenceError("We couldn't update notifications. Please try again.");
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [
      analytics,
      household?._id,
      recalculateReminders,
      registerDevice,
      updatePreferences,
    ],
  );

  const handleAnalyticsChange = useCallback(
    async (enabled: boolean) => {
      setIsSavingPreferences(true);
      setPreferenceError(null);
      const consent = enabled ? "granted" : "denied";
      try {
        await updatePreferences({ analyticsConsent: consent });
        analytics.setConsent(consent);
      } catch (error) {
        console.error("Couldn't update analytics preference:", error);
        setPreferenceError("We couldn't update analytics sharing. Please try again.");
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [analytics, updatePreferences],
  );

  const handleReminderTimeChange = useCallback(
    async (value: string) => {
      const nextTime = Number(value);
      if (
        !Number.isInteger(nextTime) ||
        nextTime < 8 * 60 ||
        nextTime >= 20 * 60 ||
        nextTime === notificationTimeMinutes
      ) {
        return;
      }

      const previousTime = notificationTimeMinutes;
      setNotificationTimeMinutes(nextTime);
      setIsSavingPreferences(true);
      setPreferenceError(null);
      try {
        await updatePreferences({ notificationTimeMinutesLocal: nextTime });
        await recalculateReminders({});
      } catch (error) {
        console.error("Couldn't update reminder time:", error);
        setNotificationTimeMinutes(previousTime);
        setPreferenceError("We couldn't update your reminder time. Please try again.");
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [notificationTimeMinutes, recalculateReminders, updatePreferences],
  );

  const handleSignOutConfirm = useCallback(async () => {
    setIsSigningOut(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      try {
        const deviceId = await getCurrentDeviceId();
        if (deviceId) await disablePushDevice({ deviceId });
        else await disablePushDevices({});
      } catch (error) {
        console.warn("Couldn't disable push tokens before sign out:", error);
      }
      await analytics.reset();
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  }, [analytics, disablePushDevice, disablePushDevices, signOut]);

  if (household === undefined) {
    return <SettingsLoadingState onBack={() => router.back()} />;
  }

  const archivedCount = archivedLists?.length ?? 0;
  const switchTrack = {
    false: themeColors.disabled,
    true: themeColors.coralSoft,
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light" edges={["top"]}>
      <PageHeader title="Settings" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-12 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {household && (
          <>
            <Text className="mb-2 mt-3 text-base font-semibold text-ink">
              Household
            </Text>
            <View className="overflow-hidden rounded-2xl border border-separator bg-surface">
              <View className="flex-row items-center px-4 py-4">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-coral-soft">
                  <Home size={23} color={themeColors.coral} strokeWidth={2} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-lg font-bold text-ink">
                    {household.name}
                  </Text>
                  <Text className="mt-0.5 text-sm text-ink-secondary">
                    {household.members.length} household {household.members.length === 1 ? "member" : "members"}
                  </Text>
                </View>
              </View>

              <View className="border-t border-separator px-4">
                {household.members.map((member) => (
                  <View
                    key={member._id}
                    className="min-h-16 flex-row items-center border-b border-separator py-3"
                  >
                    <UserAvatar
                      name={member.user?.name || "User"}
                      imageUrl={member.user?.imageUrl}
                      size={40}
                      showTooltip={false}
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-semibold text-ink">
                        {member.user?.name || "Unknown"}
                      </Text>
                      <Text className="text-sm text-ink-secondary">
                        {member.role === "owner" ? "Household owner" : "Member"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleCopyInviteCode}
                className="min-h-16 flex-row items-center px-4 py-3 active:bg-warm-gray-50"
                accessibilityLabel={`Copy invite code ${household.inviteCode}`}
                accessibilityRole="button"
                accessibilityHint="Copies the household invite code"
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-warm-gray-100">
                  <UserPlus
                    size={21}
                    color={themeColors.secondaryInk}
                    strokeWidth={2}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-ink">
                    Invite another member
                  </Text>
                  <Text className="mt-0.5 font-mono text-sm font-semibold tracking-widest text-coral">
                    {household.inviteCode}
                  </Text>
                </View>
                {codeCopied ? (
                  <View className="flex-row items-center">
                    <Check size={18} color={themeColors.teal} strokeWidth={2.5} />
                    <Text className="ml-1 text-sm font-semibold text-teal">
                      Copied
                    </Text>
                  </View>
                ) : (
                  <Copy size={20} color={themeColors.secondaryInk} strokeWidth={2} />
                )}
              </Pressable>
            </View>

            <Text className="mb-2 mt-7 text-base font-semibold text-ink">
              Grocery budget
            </Text>
            <View className="rounded-2xl border border-separator bg-surface p-4">
              <View className="mb-4 flex-row items-center">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-soft">
                  <PiggyBank size={21} color={themeColors.teal} strokeWidth={2} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-ink">
                    Monthly guide
                  </Text>
                  <Text className="mt-0.5 text-sm text-ink-secondary">
                    Shared by everyone in your household
                  </Text>
                </View>
              </View>
              <Input
                label="Budget in pounds"
                value={monthlyBudget}
                onChangeText={(value) => {
                  setMonthlyBudget(value);
                  setBudgetError("");
                }}
                error={budgetError}
                placeholder="e.g. £400"
                keyboardType="decimal-pad"
                containerClassName="mb-3"
              />
              <Button
                variant="tonal"
                onPress={handleSaveBudget}
                loading={isSavingBudget}
                className="w-full"
                accessibilityLabel="Save monthly grocery budget"
              >
                Save budget
              </Button>
            </View>
          </>
        )}

        <Text className="mb-2 mt-7 text-base font-semibold text-ink">
          Reminders and privacy
        </Text>
        <View className="overflow-hidden rounded-2xl border border-separator bg-surface">
          <View className="min-h-20 flex-row items-center px-4 py-3">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-coral-soft">
              <Bell size={21} color={themeColors.coral} strokeWidth={2} />
            </View>
            <View className="ml-3 flex-1 pr-3">
              <Text className="text-base font-semibold text-ink">
                Restock reminders
              </Text>
              <Text className="mt-0.5 text-sm leading-5 text-ink-secondary">
                Quiet prompts with no item names on the lock screen
              </Text>
            </View>
            <Switch
              value={preferences?.restockNotificationsEnabled ?? false}
              onValueChange={(value) => void handleNotificationChange(value)}
              disabled={isSavingPreferences || preferences === undefined}
              trackColor={switchTrack}
              thumbColor={
                preferences?.restockNotificationsEnabled
                  ? themeColors.coral
                  : themeColors.surface
              }
              accessibilityLabel="Restock reminders"
            />
          </View>

          {preferences?.restockNotificationsEnabled && (
            <>
              <View className="mx-4 h-px bg-separator" />
              <View className="px-4 py-4">
                <Text className="text-sm font-semibold text-ink">
                  Reminder time
                </Text>
                <Text className="mt-1 text-sm leading-5 text-ink-secondary">
                  We use {preferences.notificationTimeZone} and keep 20:00–08:00
                  quiet.
                </Text>
                <GlassSegmentedControl
                  value={String(notificationTimeMinutes)}
                  options={reminderTimeOptions}
                  onValueChange={(value) => void handleReminderTimeChange(value)}
                  disabled={isSavingPreferences}
                  accessibilityLabel="Restock reminder time"
                  className="mt-3"
                />
              </View>
            </>
          )}

          <View className="mx-4 h-px bg-separator" />

          <View className="min-h-20 flex-row items-center px-4 py-3">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-soft">
              <BarChart3 size={21} color={themeColors.teal} strokeWidth={2} />
            </View>
            <View className="ml-3 flex-1 pr-3">
              <Text className="text-base font-semibold text-ink">
                Share usage analytics
              </Text>
              <Text className="mt-0.5 text-sm leading-5 text-ink-secondary">
                Never includes item names, receipt text or grocery amounts
              </Text>
            </View>
            <Switch
              value={preferences?.analyticsConsent === "granted"}
              onValueChange={(value) => void handleAnalyticsChange(value)}
              disabled={isSavingPreferences || preferences === undefined}
              trackColor={{
                false: themeColors.disabled,
                true: themeColors.tealSoft,
              }}
              thumbColor={
                preferences?.analyticsConsent === "granted"
                  ? themeColors.teal
                  : themeColors.surface
              }
              accessibilityLabel="Share usage analytics"
            />
          </View>

          {preferenceError && (
            <Text
              className="border-t border-separator px-4 py-3 text-sm leading-5 text-red-700"
              accessibilityRole="alert"
            >
              {preferenceError}
            </Text>
          )}
        </View>

        <Text className="mb-2 mt-7 text-base font-semibold text-ink">
          Lists
        </Text>
        <View className="overflow-hidden rounded-2xl border border-separator bg-surface">
          <Pressable
            onPress={toggleArchivedSection}
            className="min-h-16 flex-row items-center px-4 py-3 active:bg-warm-gray-50"
            accessibilityRole="button"
            accessibilityLabel={`${archivedExpanded ? "Collapse" : "Expand"} archived lists`}
            accessibilityState={{ expanded: archivedExpanded }}
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-warm-gray-100">
              <Archive
                size={21}
                color={themeColors.secondaryInk}
                strokeWidth={2}
              />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink">
                Archived lists
              </Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                {archivedCount === 0
                  ? "No archived lists"
                  : `${archivedCount} archived ${archivedCount === 1 ? "list" : "lists"}`}
              </Text>
            </View>
            <ChevronDown
              size={20}
              color={themeColors.secondaryInk}
              strokeWidth={2}
              style={{ transform: [{ rotate: archivedExpanded ? "180deg" : "0deg" }] }}
            />
          </Pressable>

          {archivedExpanded && (
            <View className="border-t border-separator px-4">
              {archivedLists === undefined ? (
                <View className="items-center py-5">
                  <ActivityIndicator size="small" color={themeColors.coral} />
                </View>
              ) : archivedLists.length === 0 ? (
                <Text className="py-5 text-center text-sm text-ink-secondary">
                  Lists you archive will appear here.
                </Text>
              ) : (
                archivedLists.map((list) => (
                  <View
                    key={list._id}
                    className="min-h-16 flex-row items-center border-b border-separator py-3"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                        {list.name}
                      </Text>
                      <Text className="text-sm text-ink-secondary">
                        {list.totalItems} {list.totalItems === 1 ? "item" : "items"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRestoreList(list._id)}
                      disabled={restoringListId === list._id}
                      className="min-h-12 flex-row items-center rounded-full bg-teal-soft px-3 py-2 disabled:opacity-50"
                      accessibilityLabel={`Restore ${list.name}`}
                      accessibilityRole="button"
                    >
                      {restoringListId === list._id ? (
                        <ActivityIndicator size="small" color={themeColors.teal} />
                      ) : (
                        <>
                          <RotateCcw size={16} color={themeColors.teal} strokeWidth={2} />
                          <Text className="ml-2 text-sm font-semibold text-teal">
                            Restore
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSignOutConfirm(true);
          }}
          className="mt-8 min-h-14 flex-row items-center justify-center rounded-full border border-separator bg-surface active:bg-warm-gray-50"
          accessibilityLabel="Sign out of your account"
          accessibilityRole="button"
        >
          <LogOut size={20} color={themeColors.error} strokeWidth={2} />
          <Text className="ml-2 text-base font-semibold text-red-700">
            Sign out
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showSignOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => setShowSignOutConfirm(false)}
        >
          <Pressable
            className="w-full max-w-sm rounded-2xl bg-surface p-6"
            onPress={() => {}}
            accessibilityViewIsModal
          >
            <Text className="text-xl font-bold text-ink">Sign out?</Text>
            <Text className="mt-2 text-base leading-6 text-ink-secondary">
              Your household data stays safe. You can sign back in at any time.
            </Text>
            <View className="mt-6 gap-2">
              <Button
                variant="danger"
                onPress={handleSignOutConfirm}
                disabled={isSigningOut}
                loading={isSigningOut}
                className="w-full"
              >
                Sign out
              </Button>
              <Button
                variant="ghost"
                onPress={() => setShowSignOutConfirm(false)}
                disabled={isSigningOut}
                className="w-full"
              >
                Cancel
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Toast
        visible={showRestoreToast}
        message="List restored"
        onDismiss={() => setShowRestoreToast(false)}
        duration={2000}
      />
      <Toast
        visible={showBudgetToast}
        message="Budget saved"
        onDismiss={() => setShowBudgetToast(false)}
        duration={2000}
      />
    </SafeAreaView>
  );
}
