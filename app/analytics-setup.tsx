import usageAnalyticsArtwork from "@/assets/onboarding/permissions/usage-analytics.png";
import { OnboardingFormScreen } from "@/components/onboarding/OnboardingFormScreen";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/_generated/api";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { themeColors } from "@/lib/theme";
import { useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import * as Application from "expo-application";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AnalyticsSetupParams = {
  cadence_bucket?: string;
  created_starter_list?: string;
  household_size_bucket?: string;
  notification_permission_answered?: "denied" | "granted";
  origin?: string;
  shopping_mode?: string;
};

export default function AnalyticsSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<AnalyticsSetupParams>();
  const { user } = useUser();
  const analytics = useAnalytics();
  const household = useQuery(api.households.getCurrentHousehold);
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveChoice = async (consent: "granted" | "denied") => {
    if (!household?._id || !user?.id || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await updatePreferences({ analyticsConsent: consent });
      analytics.setConsent(consent);

      if (consent === "granted") {
        analytics.identify(user.id, household._id);
        const common = {
          household_id: household._id,
          market: household.marketCountryCode,
          platform: Platform.OS,
          app_version: Application.nativeApplicationVersion ?? undefined,
        };

        if (params.notification_permission_answered) {
          analytics.track("notification permission answered", {
            ...common,
            answer: params.notification_permission_answered,
          });
        }

        if (params.origin === "activation") {
          analytics.track("activation completed", {
            ...common,
            household_size_bucket:
              params.household_size_bucket ?? "not_provided",
            cadence_bucket: params.cadence_bucket ?? "not_provided",
            shopping_mode: params.shopping_mode ?? "not_provided",
          });
          if (params.created_starter_list === "1") {
            analytics.track("shopping list created", {
              ...common,
              source: "activation",
            });
          }
        } else if (params.origin === "join") {
          analytics.track("household member joined", {
            ...common,
            source: "invite_code",
          });
        }
      }

      router.replace("/(tabs)");
    } catch (caughtError) {
      console.error("Couldn't save analytics preference:", caughtError);
      setError("We couldn't save your choice. Please try again.");
      setIsSaving(false);
    }
  };

  if (!household || !user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-light">
        <ActivityIndicator size="large" color={themeColors.coral} />
        <Text className="mt-3 text-ink-secondary">Preparing your plan…</Text>
      </SafeAreaView>
    );
  }

  return (
    <OnboardingFormScreen
      artworkSource={usageAnalyticsArtwork}
      title="Help improve OurPantry"
      description="Share limited usage events to help us make planning and shopping better for your household."
      footer={
        <View>
          <Button
            size="lg"
            forceSolid
            loading={isSaving}
            disabled={isSaving}
            onPress={() => void saveChoice("granted")}
            className="w-full"
            accessibilityLabel="Share limited usage analytics"
          >
            Share usage analytics
          </Button>
          <Button
            variant="ghost"
            size="md"
            forceSolid
            disabled={isSaving}
            onPress={() => void saveChoice("denied")}
            className="mt-2 w-full"
            accessibilityLabel="Continue without sharing usage analytics"
          >
            Continue without sharing
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
              Your shopping stays private
            </Text>
            <Text className="mt-1 text-[15px] leading-6 text-ink-secondary">
              We never send product names, notes, receipt images or text,
              grocery amounts, email addresses, or invite codes to analytics.
            </Text>
          </View>
        </View>
      </View>

      <Text className="mt-5 text-sm leading-5 text-ink-secondary">
        This is optional. You can change your choice any time in Settings.
      </Text>

      {error ? (
        <Text
          className="mt-4 text-sm leading-5 text-red-700"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </OnboardingFormScreen>
  );
}
