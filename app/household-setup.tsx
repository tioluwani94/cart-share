import { InviteCode } from "@/components/household-setup/InviteCode";
import { OnboardingFormScreen } from "@/components/onboarding/OnboardingFormScreen";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/convex/_generated/api";
import { useConvex, useMutation } from "convex/react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import createHouseholdArtwork from "@/assets/onboarding/household/create-household.png";

/**
 * Household setup screen for new users.
 * Allows creating a new household with a unique invite code.
 */
export default function HouseholdSetupScreen() {
  const router = useRouter();
  const convex = useConvex();
  const createHousehold = useMutation(api.households.create);

  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) {
      setError("Please give your household a name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createHousehold({ name: householdName.trim() });
      setInviteCode(result.inviteCode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";

      if (message.includes("already belong to a household")) {
        try {
          const existingHousehold = await convex.query(
            api.households.getCurrentHousehold,
          );

          if (existingHousehold) {
            router.replace(
              existingHousehold.restockSetupCompletedAt === undefined
                ? "/restock-setup"
                : "/(tabs)",
            );
            return;
          }
        } catch {
          // The friendly message below is safer than exposing backend details.
        }

        setError(
          "Your household already exists. Please reopen the app and try again.",
        );
      } else {
        setError("We couldn't create your household. Please try again.");
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;

    await Clipboard.setStringAsync(inviteCode);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    router.replace("/(tabs)");
  };

  // Show invite code screen after household is created
  if (inviteCode) {
    return (
      <InviteCode
        copied={copied}
        inviteCode={inviteCode}
        householdName={householdName}
        handleContinue={handleContinue}
        handleCopyCode={handleCopyCode}
      />
    );
  }

  // Initial creation screen
  return (
    <OnboardingFormScreen
      artworkSource={createHouseholdArtwork}
      title="Name your household"
      description="Keep everyone's grocery plan in one place."
      footer={
        <Button
          onPress={handleCreate}
          loading={isCreating}
          disabled={isCreating}
          size="lg"
          className="w-full"
          accessibilityLabel="Create household"
          forceSolid
        >
          Continue
        </Button>
      }
    >
      <View>
        <Input
          label="Household name"
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="e.g. The Smiths"
          autoCapitalize="words"
          autoCorrect={false}
          error={error ?? undefined}
          keyboardType="default"
        />
        <View className="mt-3 items-center">
          <Pressable
            onPress={() => router.push("/join-household")}
            className="min-h-11 justify-center py-2"
            accessibilityLabel="Join an existing household with an invite code"
            accessibilityRole="link"
          >
            <Text className="text-base text-warm-gray-600">
              Have an invite code?{" "}
              <Text className="font-semibold text-teal">Join instead</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </OnboardingFormScreen>
  );
}
