import {
  Button,
  GlassBottomSheet,
  GlassBottomSheetView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
  PageHeader,
  usePageHeaderHeight,
  useToast,
  UserAvatar,
} from "@/components/ui";
import {
  BudgetEditSheet,
  ReminderTimeSheet,
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from "@/components/settings";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { keyboardDismissScrollProps } from "@/lib/keyboard";
import { OUR_PANTRY_URLS } from "@/lib/legalUrls";
import {
  cancelAccountDeletionCleanup,
  finishAccountDeletionLocalCleanup,
  markAccountDeletionCleanupRequired,
} from "@/lib/accountDeletionCleanup";
import {
  formatCurrencyFromPence,
  parseCurrencyInputToPence,
} from "@/lib/formatters";
import {
  getCurrentDeviceId,
  registerForPushNotifications,
} from "@/lib/pushNotifications";
import { themeColors } from "@/lib/theme";
import { isClerkAPIResponseError, useAuth, useUser } from "@clerk/expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Archive,
  BarChart3,
  Bell,
  Clock3,
  FileText,
  Home,
  LifeBuoy,
  LogOut,
  PiggyBank,
  RotateCcw,
  Share2,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
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

function isDefinitiveDeletionRefusal(error: unknown): boolean {
  if (!isClerkAPIResponseError(error)) return false;
  return (
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 404 &&
    error.status !== 408
  );
}

function SettingsLoadingState({ onBack }: { onBack: () => void }) {
  const pageHeaderHeight = usePageHeaderHeight();

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["left", "right", "bottom"]}
    >
      <PageHeader title="Settings" onBack={onBack} />
      <View className="px-6" style={{ paddingTop: pageHeaderHeight + 20 }}>
        <View className="h-5 w-24 rounded-lg bg-warm-gray-100" />
        <View className="mt-3 h-48 rounded-2xl border border-separator bg-surface" />
      </View>
    </SafeAreaView>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const budgetEntryHandled = useRef(false);
  const pageHeaderHeight = usePageHeaderHeight();
  const { showToast } = useToast();
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [restoringListId, setRestoringListId] = useState<Id<"lists"> | null>(
    null,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signOutSheetRef = useRef<GlassBottomSheetRef>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountDeletionError, setAccountDeletionError] = useState<
    string | null
  >(null);
  const deleteAccountSheetRef = useRef<GlassBottomSheetRef>(null);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const budgetSheetRef = useRef<GlassBottomSheetRef>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [reminderTimeError, setReminderTimeError] = useState<string | null>(
    null,
  );
  const reminderTimeSheetRef = useRef<GlassBottomSheetRef>(null);
  const [showNotificationSettingsLink, setShowNotificationSettingsLink] =
    useState(false);
  const [notificationTimeMinutes, setNotificationTimeMinutes] = useState(
    18 * 60,
  );
  const { signOut } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const { user: clerkUser } = useUser();
  const analytics = useAnalytics();
  const canQueryAuthenticatedData =
    isConvexAuthenticated && !isSigningOut && !isDeletingAccount;
  const household = useQuery(
    api.households.getCurrentHousehold,
    canQueryAuthenticatedData ? {} : "skip",
  );
  const preferences = useQuery(
    api.notifications.getPreferences,
    canQueryAuthenticatedData ? {} : "skip",
  );
  const archivedLists = useQuery(
    api.lists.getArchivedByHousehold,
    canQueryAuthenticatedData && household?._id
      ? { householdId: household._id }
      : "skip",
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
      setRestoringListId(listId);
      try {
        await unarchiveList({ listId });
        showToast({ message: "List restored", tone: "success" });
      } catch (error) {
        console.error("Failed to restore list:", error);
      } finally {
        setRestoringListId(null);
      }
    },
    [showToast, unarchiveList],
  );

  const handleShareInviteCode = useCallback(async () => {
    if (!household?.inviteCode) return;
    try {
      const result = await Share.share({
        title: `Join ${household.name} on OurPantry`,
        message: `Join ${household.name} on OurPantry using invite code ${household.inviteCode}.`,
      });
      if (result.action === Share.sharedAction) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        analytics.track("household invite shared", {
          household_id: household._id,
          source: "settings",
        });
      }
    } catch (error) {
      console.error("Failed to share household invite:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({ message: "Couldn't open sharing", tone: "error" });
    }
  }, [analytics, household, showToast]);

  const openBudgetEditor = useCallback(() => {
    setMonthlyBudget(
      household?.monthlyBudgetPence === undefined
        ? ""
        : (household.monthlyBudgetPence / 100).toFixed(2),
    );
    setBudgetError("");
    budgetSheetRef.current?.present();
  }, [household?.monthlyBudgetPence]);

  useEffect(() => {
    if (edit !== "budget") {
      budgetEntryHandled.current = false;
      return;
    }
    if (!household || budgetEntryHandled.current) return;
    budgetEntryHandled.current = true;
    openBudgetEditor();
    // Consume the entry request so live household updates never reopen it.
    router.setParams({ edit: undefined });
  }, [edit, household, openBudgetEditor, router]);

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
      budgetSheetRef.current?.dismiss();
      showToast({ message: "Budget saved", tone: "success" });
    } catch (error) {
      console.error("Failed to save monthly budget:", error);
      setBudgetError("Couldn't save the budget. Please try again.");
    } finally {
      setIsSavingBudget(false);
    }
  }, [monthlyBudget, saveMonthlyBudget, showToast]);

  const handleNotificationChange = useCallback(
    async (enabled: boolean) => {
      setIsSavingPreferences(true);
      setPreferenceError(null);
      setShowNotificationSettingsLink(false);
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
              "Notifications are turned off for OurPantry in device settings.",
          );
          setShowNotificationSettingsLink(registration.status === "denied");
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
        setPreferenceError(
          "We couldn't update notifications. Please try again.",
        );
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

  const openNotificationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Couldn't open notification settings:", error);
      setShowNotificationSettingsLink(false);
      setPreferenceError(
        "Open your device Settings and allow notifications for OurPantry.",
      );
    }
  }, []);

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
        setPreferenceError(
          "We couldn't update analytics sharing. Please try again.",
        );
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
        return false;
      }

      const previousTime = notificationTimeMinutes;
      setNotificationTimeMinutes(nextTime);
      setIsSavingPreferences(true);
      setReminderTimeError(null);
      try {
        await updatePreferences({ notificationTimeMinutesLocal: nextTime });
        await recalculateReminders({});
        void Haptics.selectionAsync();
        return true;
      } catch (error) {
        console.error("Couldn't update reminder time:", error);
        setNotificationTimeMinutes(previousTime);
        setReminderTimeError(
          "We couldn't update your reminder time. Please try again.",
        );
        return false;
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [notificationTimeMinutes, recalculateReminders, updatePreferences],
  );

  const openReminderTimeEditor = useCallback(() => {
    setReminderTimeError(null);
    reminderTimeSheetRef.current?.present();
  }, []);

  const handleReminderTimeSelection = useCallback(
    async (value: string) => {
      if (value === String(notificationTimeMinutes)) {
        reminderTimeSheetRef.current?.dismiss();
        return;
      }
      const didSave = await handleReminderTimeChange(value);
      if (didSave) reminderTimeSheetRef.current?.dismiss();
    },
    [handleReminderTimeChange, notificationTimeMinutes],
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
      signOutSheetRef.current?.dismiss();
    }
  }, [analytics, disablePushDevice, disablePushDevices, signOut]);

  const handleDeleteAccountConfirm = useCallback(async () => {
    setIsDeletingAccount(true);
    setAccountDeletionError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let accountDeleted = false;
    let cleanupMarked = false;
    const finishLocalCleanup = async ({
      onSuccess = () => router.replace("/(auth)/welcome"),
      failureTitle = "Account deleted",
      failureMessage = "We couldn't verify that this device's local data was removed. Try again. If it continues, close and reopen OurPantry so cleanup can finish before you sign in again.",
    }: {
      onSuccess?: () => void;
      failureTitle?: string;
      failureMessage?: string;
    } = {}): Promise<boolean> => {
      try {
        await finishAccountDeletionLocalCleanup();
      } catch (error) {
        console.error("Local account cleanup failed:", error);
        Alert.alert(failureTitle, failureMessage, [
          {
            text: "Try again",
            onPress: () => {
              void finishLocalCleanup({
                onSuccess,
                failureTitle,
                failureMessage,
              });
            },
          },
        ]);
        return false;
      }
      onSuccess();
      return true;
    };
    try {
      if (!clerkUser) throw new Error("Clerk user is unavailable");
      try {
        const deviceId = await getCurrentDeviceId();
        if (deviceId) await disablePushDevice({ deviceId });
        else await disablePushDevices({});
      } catch (error) {
        console.warn("Couldn't disable push tokens before deletion:", error);
      }

      try {
        await analytics.reset();
      } catch (error) {
        console.warn("Couldn't reset analytics before deletion:", error);
      }

      await markAccountDeletionCleanupRequired();
      cleanupMarked = true;
      await clerkUser.delete();
      accountDeleted = true;
      try {
        await signOut();
      } catch (error) {
        console.warn("Couldn't clear the Clerk session after deletion:", error);
      }
      await finishLocalCleanup();
    } catch (error) {
      const definitiveRefusal =
        !accountDeleted && isDefinitiveDeletionRefusal(error);
      if (definitiveRefusal && cleanupMarked) {
        try {
          await cancelAccountDeletionCleanup();
        } catch (cleanupError) {
          console.warn(
            "Couldn't cancel the local account-deletion cleanup marker:",
            cleanupError,
          );
        }
      }
      if (!accountDeleted && cleanupMarked && !definitiveRefusal) {
        try {
          await signOut();
        } catch (signOutError) {
          console.warn(
            "Couldn't clear the in-memory Clerk session after an unconfirmed deletion:",
            signOutError,
          );
        }
        await finishLocalCleanup({
          failureTitle: "Deletion status unconfirmed",
          failureMessage:
            "The provider did not confirm whether deletion completed, and this device's local data has not been fully removed yet. Try again to finish local cleanup safely.",
          onSuccess: () => {
            Alert.alert(
              "Deletion status unconfirmed",
              "The provider did not confirm whether deletion completed, so this device's local data and saved sign-in were removed for safety. Sign in again to check; if the account still exists, you can retry deletion.",
              [
                {
                  text: "Continue",
                  onPress: () => router.replace("/(auth)/welcome"),
                },
              ],
            );
          },
        });
        return;
      }
      console.error("Account deletion failed:", error);
      setAccountDeletionError(
        accountDeleted
          ? "Your account was deleted, but this screen could not close. Please restart OurPantry."
          : "Your account was not deleted. Please try again.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsDeletingAccount(false);
    }
  }, [
    analytics,
    clerkUser,
    disablePushDevice,
    disablePushDevices,
    router,
    signOut,
  ]);

  const openExternalPage = useCallback(
    async (url: string, label: string) => {
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error(`Could not open ${label}:`, error);
        showToast({
          message: `Couldn't open ${label}`,
          tone: "error",
        });
      }
    },
    [showToast],
  );

  if (household === undefined) {
    return <SettingsLoadingState onBack={() => router.back()} />;
  }

  const archivedCount = archivedLists?.length ?? 0;
  const formattedMonthlyBudget =
    household?.monthlyBudgetPence === undefined
      ? "Not set"
      : formatCurrencyFromPence(household.monthlyBudgetPence);
  const accountDeletionImpact = !household
    ? "Your account will be permanently deleted."
    : household.members.length > 1
      ? household.userRole === "owner"
        ? "Your account will leave this household. Ownership will pass to another member, and the household's lists, history, and receipts will stay available to them."
        : "Your account will leave this household. The household's lists, history, and receipts will stay available to the other member."
      : "Your account and this household will be permanently deleted, including its lists, shopping history, and receipts.";

  return (
    <SafeAreaView
      className="flex-1 bg-background-light"
      edges={["left", "right", "bottom"]}
    >
      <PageHeader title="Settings" onBack={() => router.back()} />
      <ScrollView
        {...keyboardDismissScrollProps}
        className="flex-1"
        contentContainerClassName="px-6 pb-12"
        contentContainerStyle={{ paddingTop: pageHeaderHeight + 8 }}
        scrollIndicatorInsets={{ top: pageHeaderHeight }}
        showsVerticalScrollIndicator={false}
      >
        {household && (
          <>
            <SettingsSection title="Household" className="mt-3">
              <SettingsRow
                icon={
                  <Home size={20} color={themeColors.coral} strokeWidth={2} />
                }
                iconTone="coral"
                title={
                  <Text className="font-heading text-lg leading-6 text-ink">
                    {household.name}
                  </Text>
                }
                subtitle={`${household.members.length} household ${
                  household.members.length === 1 ? "member" : "members"
                }`}
              />

              {household.members.map((member) => (
                <SettingsRow
                  key={member._id}
                  leading={
                    <UserAvatar
                      name={member.user?.name || "User"}
                      imageUrl={member.user?.imageUrl}
                      size={40}
                      showTooltip={false}
                    />
                  }
                  title={member.user?.name || "Unknown"}
                  subtitle={
                    member.role === "owner" ? "Household owner" : "Member"
                  }
                />
              ))}

              <SettingsRow
                icon={
                  <UserPlus
                    size={19}
                    color={themeColors.secondaryInk}
                    strokeWidth={2}
                  />
                }
                title="Invite another member"
                subtitle={household.inviteCode}
                subtitleClassName="font-mono font-semibold tracking-widest text-coral"
                trailing={
                  <Share2
                    size={20}
                    color={themeColors.secondaryInk}
                    strokeWidth={2}
                  />
                }
                onPress={handleShareInviteCode}
                isLast
                accessibilityLabel={`Share invite to ${household.name}, code ${household.inviteCode}`}
                accessibilityHint="Opens the native share sheet with the household invite code"
              />
            </SettingsSection>

            <SettingsSection title="Planning">
              <SettingsRow
                icon={
                  <PiggyBank
                    size={19}
                    color={themeColors.teal}
                    strokeWidth={2}
                  />
                }
                iconTone="teal"
                title="Monthly grocery budget"
                subtitle="Shared by your household"
                trailingValue={formattedMonthlyBudget}
                disclosure
                onPress={openBudgetEditor}
                accessibilityLabel={`Edit monthly grocery budget, ${
                  household.monthlyBudgetPence === undefined
                    ? "currently not set"
                    : `current value ${formattedMonthlyBudget}`
                }`}
                accessibilityHint="Opens the monthly budget editor"
              />

              <SettingsRow
                icon={
                  <Archive
                    size={19}
                    color={themeColors.secondaryInk}
                    strokeWidth={2}
                  />
                }
                title="Archived lists"
                subtitle={
                  archivedLists === undefined
                    ? "Loading archived lists"
                    : archivedCount === 0
                      ? "No archived lists"
                      : `${archivedCount} archived ${
                          archivedCount === 1 ? "list" : "lists"
                        }`
                }
                trailing={
                  archivedLists === undefined ? (
                    <ActivityIndicator
                      size="small"
                      color={themeColors.secondaryInk}
                    />
                  ) : undefined
                }
                disclosure={archivedCount > 0}
                expanded={archivedCount > 0 ? archivedExpanded : undefined}
                onPress={archivedCount > 0 ? toggleArchivedSection : undefined}
                isLast={!archivedExpanded}
                accessibilityLabel={
                  archivedCount > 0
                    ? `${archivedExpanded ? "Collapse" : "Expand"} archived lists`
                    : undefined
                }
                accessibilityState={
                  archivedCount > 0 ? { expanded: archivedExpanded } : undefined
                }
              />

              {archivedExpanded && archivedLists
                ? archivedLists.map((list, index) => (
                    <SettingsRow
                      key={list._id}
                      title={list.name}
                      subtitle={`${list.totalItems} ${
                        list.totalItems === 1 ? "item" : "items"
                      }`}
                      className="pl-16"
                      isLast={index === archivedLists.length - 1}
                      trailing={
                        <Button
                          variant="tonal"
                          size="sm"
                          forceSolid
                          onPress={() => handleRestoreList(list._id)}
                          loading={restoringListId === list._id}
                          disabled={restoringListId === list._id}
                          accessibilityLabel={`Restore ${list.name}`}
                        >
                          <RotateCcw
                            size={16}
                            color={themeColors.teal}
                            strokeWidth={2}
                          />
                          <Text className="ml-2 text-sm font-semibold text-teal">
                            Restore
                          </Text>
                        </Button>
                      }
                    />
                  ))
                : null}
            </SettingsSection>
          </>
        )}

        <SettingsSection title="Notifications & privacy">
          <SettingsToggleRow
            icon={<Bell size={19} color={themeColors.coral} strokeWidth={2} />}
            iconTone="coral"
            title="Shopping insights & reminders"
            subtitle="Possible regulars and restock prompts, with no item names on the lock screen"
            value={preferences?.restockNotificationsEnabled ?? false}
            onValueChange={(value) => void handleNotificationChange(value)}
            disabled={isSavingPreferences || preferences === undefined}
            accessibilityLabel="Shopping insights and reminders"
          />

          {preferences?.restockNotificationsEnabled ? (
            <SettingsRow
              icon={
                <Clock3
                  size={19}
                  color={themeColors.secondaryInk}
                  strokeWidth={2}
                />
              }
              title="Reminder time"
              subtitle={`Quiet hours 20:00–08:00 · ${preferences.notificationTimeZone}`}
              trailingValue={formatReminderTime(notificationTimeMinutes)}
              disclosure
              onPress={openReminderTimeEditor}
              accessibilityLabel={`Change reminder time, current time ${formatReminderTime(
                notificationTimeMinutes,
              )}`}
              accessibilityHint="Opens the reminder time picker"
            />
          ) : null}

          <SettingsToggleRow
            icon={
              <BarChart3 size={19} color={themeColors.teal} strokeWidth={2} />
            }
            iconTone="teal"
            title="Share usage analytics"
            subtitle="Never includes item names, receipt text or grocery amounts"
            value={preferences?.analyticsConsent === "granted"}
            onValueChange={(value) => void handleAnalyticsChange(value)}
            disabled={isSavingPreferences || preferences === undefined}
            accessibilityLabel="Share usage analytics"
            switchTint="teal"
            isLast={!preferenceError}
          />

          {preferenceError ? (
            <View className="border-t border-separator px-4 py-3">
              <Text
                className="text-sm leading-5 text-red-700"
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {preferenceError}
              </Text>
              {showNotificationSettingsLink ? (
                <Button
                  variant="tonal"
                  size="sm"
                  forceSolid
                  onPress={() => void openNotificationSettings()}
                  className="mt-3 self-start"
                  accessibilityLabel="Open device notification settings"
                  accessibilityHint="Opens this app's notification permissions in device settings"
                >
                  Open device settings
                </Button>
              ) : null}
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title="About & legal">
          <SettingsRow
            icon={
              <ShieldCheck size={19} color={themeColors.teal} strokeWidth={2} />
            }
            iconTone="teal"
            title="Privacy Policy"
            subtitle="How OurPantry handles your data"
            disclosure
            onPress={() =>
              void openExternalPage(OUR_PANTRY_URLS.privacy, "Privacy Policy")
            }
            accessibilityLabel="Open Privacy Policy"
            accessibilityHint="Opens the OurPantry Privacy Policy in your browser"
          />
          <SettingsRow
            icon={
              <FileText
                size={19}
                color={themeColors.secondaryInk}
                strokeWidth={2}
              />
            }
            title="Terms of Use"
            subtitle="The terms for using OurPantry"
            disclosure
            onPress={() =>
              void openExternalPage(OUR_PANTRY_URLS.terms, "Terms of Use")
            }
            accessibilityLabel="Open Terms of Use"
            accessibilityHint="Opens the OurPantry Terms of Use in your browser"
          />
          <SettingsRow
            icon={
              <LifeBuoy size={19} color={themeColors.coral} strokeWidth={2} />
            }
            iconTone="coral"
            title="Support"
            subtitle="Help, contact and account deletion guidance"
            disclosure
            onPress={() =>
              void openExternalPage(OUR_PANTRY_URLS.support, "Support")
            }
            isLast
            accessibilityLabel="Open OurPantry Support"
            accessibilityHint="Opens the OurPantry support page in your browser"
          />
        </SettingsSection>

        <SettingsSection
          title="Account"
          footer="Deleting your account is permanent. We’ll explain exactly what will be removed before you confirm."
        >
          <SettingsRow
            icon={
              <LogOut size={19} color={themeColors.error} strokeWidth={2} />
            }
            title="Sign out"
            destructive
            onPress={() => signOutSheetRef.current?.present()}
            accessibilityLabel="Sign out of your account"
            accessibilityHint="Opens a sign-out confirmation"
          />
          <SettingsRow
            icon={
              <Trash2 size={19} color={themeColors.error} strokeWidth={2} />
            }
            iconTone="danger"
            title="Delete account"
            destructive
            onPress={() => {
              setAccountDeletionError(null);
              deleteAccountSheetRef.current?.present();
            }}
            isLast
            accessibilityLabel="Delete your account"
            accessibilityHint="Opens a permanent account deletion confirmation"
          />
        </SettingsSection>
      </ScrollView>

      <BudgetEditSheet
        ref={budgetSheetRef}
        value={monthlyBudget}
        onChangeText={(value) => {
          setMonthlyBudget(value);
          setBudgetError("");
        }}
        onSave={handleSaveBudget}
        onClose={() => budgetSheetRef.current?.dismiss()}
        error={budgetError}
        isSaving={isSavingBudget}
      />

      <ReminderTimeSheet
        ref={reminderTimeSheetRef}
        value={String(notificationTimeMinutes)}
        options={reminderTimeOptions}
        onValueChange={(value) => void handleReminderTimeSelection(value)}
        onClose={() => reminderTimeSheetRef.current?.dismiss()}
        error={reminderTimeError}
        isSaving={isSavingPreferences}
      />

      <GlassBottomSheet
        ref={signOutSheetRef}
        enableDynamicSizing
        dismissible={!isSigningOut}
      >
        <GlassBottomSheetView className="px-6 pb-10 pt-2">
          <GlassSheetHeader
            title="Sign out?"
            description="Your household data stays safe. You can sign back in at any time."
            icon={
              <LogOut
                size={21}
                color={themeColors.secondaryInk}
                strokeWidth={2}
              />
            }
            tone="neutral"
            onClose={() => signOutSheetRef.current?.dismiss()}
            closeDisabled={isSigningOut}
            closeAccessibilityLabel="Cancel sign out"
          />
          <View className="gap-2">
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
              onPress={() => signOutSheetRef.current?.dismiss()}
              disabled={isSigningOut}
              className="w-full"
            >
              Cancel
            </Button>
          </View>
        </GlassBottomSheetView>
      </GlassBottomSheet>

      <GlassBottomSheet
        ref={deleteAccountSheetRef}
        enableDynamicSizing
        dismissible={!isDeletingAccount}
      >
        <GlassBottomSheetView className="px-6 pb-10 pt-2">
          <GlassSheetHeader
            title="Delete your account?"
            description={`${accountDeletionImpact} This cannot be undone.`}
            icon={
              <Trash2 size={21} color={themeColors.error} strokeWidth={2} />
            }
            tone="danger"
            onClose={() => deleteAccountSheetRef.current?.dismiss()}
            closeDisabled={isDeletingAccount}
            closeAccessibilityLabel="Cancel account deletion"
          />
          {accountDeletionError ? (
            <Text
              className="mb-4 text-sm leading-5 text-red-700"
              accessibilityRole="alert"
            >
              {accountDeletionError}
            </Text>
          ) : null}
          <View className="gap-2">
            <Button
              variant="danger"
              onPress={handleDeleteAccountConfirm}
              disabled={isDeletingAccount}
              loading={isDeletingAccount}
              className="w-full"
              accessibilityLabel="Permanently delete your account"
            >
              Delete account permanently
            </Button>
            <Button
              variant="ghost"
              onPress={() => deleteAccountSheetRef.current?.dismiss()}
              disabled={isDeletingAccount}
              className="w-full"
            >
              Cancel
            </Button>
          </View>
        </GlassBottomSheetView>
      </GlassBottomSheet>
    </SafeAreaView>
  );
}
