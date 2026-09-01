import createHouseholdArtwork from "@/assets/onboarding/household/create-household.png";
import { OnboardingFormScreen } from "@/components/onboarding/OnboardingFormScreen";
import { Button } from "@/components/ui/Button";
import { Text, View } from "react-native";

interface InviteCodeProps {
  inviteCode: string;
  householdName: string;
  handleContinue: () => void;
  handleCopyCode: () => void;
  copied: boolean;
}

export function InviteCode({
  copied,
  inviteCode,
  householdName,
  handleContinue,
  handleCopyCode,
}: InviteCodeProps) {
  return (
    <OnboardingFormScreen
      artworkSource={createHouseholdArtwork}
      title="Household ready"
      description={`Welcome to ${householdName}. Invite someone now or find this code later in Settings.`}
      footer={
        <Button
          onPress={handleContinue}
          size="lg"
          className="w-full"
          forceSolid
        >
          Set up your plan
        </Button>
      }
    >
      <View className="rounded-3xl border border-separator bg-surface p-6">
        <Text className="text-center text-sm font-semibold text-ink-secondary">
          Invite code
        </Text>

        <View className="mt-4 rounded-2xl bg-warm-gray-50 py-6">
          <Text
            className="text-center text-4xl tracking-[8px] text-coral"
            style={{ fontFamily: "Nunito_900Black" }}
            accessibilityLabel={`Invite code: ${inviteCode
              .split("")
              .join(" ")}`}
          >
            {inviteCode}
          </Text>
        </View>

        <View className="mt-4">
          <Button
            variant="tonal"
            onPress={handleCopyCode}
            size="md"
            className="w-full"
            accessibilityLabel={
              copied ? "Copied to clipboard" : "Copy invite code"
            }
          >
            {copied ? "Copied!" : "Copy code"}
          </Button>
        </View>
      </View>
    </OnboardingFormScreen>
  );
}
