import restockReminderArtwork from "@/assets/onboarding/permissions/restock-reminder.png";
import { OnboardingFormScreen } from "@/components/onboarding/OnboardingFormScreen";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/_generated/api";
import { registerForPushNotifications } from "@/lib/pushNotifications";
import { themeColors } from "@/lib/theme";
import { useMutation, useQuery } from "convex/react";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationSetupParams = {
  cadence_bucket?: string;
  created_starter_list?: string;
  household_size_bucket?: string;
  origin?: string;
  shopping_mode?: string;
};

type PermissionFailure = "denied" | "unavailable" | null;

export default function NotificationSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<NotificationSetupParams>();
  const household = useQuery(api.households.getCurrentHousehold);
  const registerDevice = useMutation(api.notifications.registerDevice);
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  const recalculateReminders = useMutation(
    api.notifications.recalculateForHousehold,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [permissionFailure, setPermissionFailure] =
    useState<PermissionFailure>(null);
  const [error, setError] = useState<string | null>(null);

  const continueToAnalytics = (permissionAnswer?: "denied" | "granted") => {
    router.replace({
      pathname: "/analytics-setup",
      params: {
        ...(params.cadence_bucket
          ? { cadence_bucket: params.cadence_bucket }
          : {}),
        ...(params.created_starter_list
          ? { created_starter_list: params.created_starter_list }
          : {}),
        ...(params.household_size_bucket
          ? { household_size_bucket: params.household_size_bucket }
          : {}),
        ...(params.origin ? { origin: params.origin } : {}),
        ...(params.shopping_mode
          ? { shopping_mode: params.shopping_mode }
          : {}),
        ...(permissionAnswer
          ? { notification_permission_answered: permissionAnswer }
          : {}),
      },
    });
  };

  const handleEnable = async () => {
    if (!household?._id || isSaving) return;
    setIsSaving(true);
    setError(null);
    setPermissionFailure(null);

    try {
      const registration = await registerForPushNotifications();
      if (registration.status !== "granted") {
        setPermissionFailure(registration.status);
        setError(
          registration.status === "denied"
            ? "Notifications are off for OurPantry. You can allow them in device settings, or continue without reminders."
            : "Reminders aren't available on this build. You can continue and turn them on later in Settings.",
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
      continueToAnalytics("granted");
    } catch (caughtError) {
      console.error("Couldn't enable notification reminders:", caughtError);
      setPermissionFailure("unavailable");
      setError("We couldn't turn on reminders. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueWithoutNotifications = async () => {
    if (!household?._id || isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
      await updatePreferences({ restockNotificationsEnabled: false });
      continueToAnalytics(
        permissionFailure === "denied" ? "denied" : undefined,
      );
    } catch (caughtError) {
      console.error("Couldn't save notification preference:", caughtError);
      setError("We couldn't save your choice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const openNotificationSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (caughtError) {
      console.error("Couldn't open notification settings:", caughtError);
      setError(
        "Open your device Settings and allow notifications for OurPantry.",
      );
    }
  };

  if (!household) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-light">
        <ActivityIndicator size="large" color={themeColors.coral} />
        <Text className="mt-3 text-ink-secondary">
          Preparing your reminders…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <OnboardingFormScreen
      artworkSource={restockReminderArtwork}
      title="Let OurPantry remember"
      description="Get a timely reminder when your household's restock review is ready."
      footer={
        <View>
          <Button
            size="lg"
            forceSolid
            loading={isSaving}
            disabled={isSaving}
            onPress={() => void handleEnable()}
            className="w-full"
            accessibilityLabel={
              permissionFailure === "denied"
                ? "Try turning on reminders again"
                : "Turn on restock reminders"
            }
          >
            {permissionFailure === "denied"
              ? "Try again"
              : "Turn on reminders"}
          </Button>
          <Button
            variant="ghost"
            size="md"
            forceSolid
            disabled={isSaving}
            onPress={() => void handleContinueWithoutNotifications()}
            className="mt-2 w-full"
            accessibilityLabel="Continue without notifications"
          >
            {permissionFailure ? "Continue without reminders" : "Not now"}
          </Button>
        </View>
      }
    >
      <View className="rounded-3xl border border-separator bg-surface p-5">
        <View className="flex-row items-start">
          <View className="mr-4 h-11 w-11 items-center justify-center rounded-2xl bg-teal-soft">
            <ShieldCheck
              size={23}
              color={themeColors.teal}
              strokeWidth={2}
            />
          </View>
          <View className="flex-1">
            <Text className="font-heading text-base leading-6 text-ink">
              Calm and private by default
            </Text>
            <Text className="mt-1 text-[15px] leading-6 text-ink-secondary">
              Reminders arrive around 18:00 and are grouped—not one alert per
              product. Item names, prices, and receipts stay off your Lock
              Screen.
            </Text>
          </View>
        </View>
      </View>

      <Text className="mt-5 text-sm leading-5 text-ink-secondary">
        You can change the time or turn reminders off in Settings.
      </Text>

      {error ? (
        <View className="mt-4">
          <Text
            className="text-sm leading-5 text-red-700"
            accessibilityRole="alert"
          >
            {error}
          </Text>
          {permissionFailure === "denied" ? (
            <Pressable
              onPress={() => void openNotificationSettings()}
              className="mt-2 min-h-11 self-start justify-center py-2"
              accessibilityRole="link"
              accessibilityLabel="Open device notification settings"
            >
              <Text className="font-heading text-sm text-coral">
                Open device settings
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </OnboardingFormScreen>
  );
}
