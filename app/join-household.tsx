import joinHouseholdArtwork from "@/assets/onboarding/household/join-household.png";
import { OnboardingFormScreen } from "@/components/onboarding/OnboardingFormScreen";
import { Button } from "@/components/ui/Button";
import { CodeInput } from "@/components/ui/CodeInput";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn } from "react-native-reanimated";

const MOTION_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const ERROR_ENTER = FadeIn.duration(150).easing(MOTION_EASE_OUT);

/**
 * Join household screen.
 * Users enter a 6-character invite code to join an existing household.
 */
export default function JoinHouseholdScreen() {
  const router = useRouter();
  const joinHousehold = useMutation(api.households.join);

  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError("Please enter all 6 characters");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinHousehold({ inviteCode: code });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/notification-setup",
        params: { origin: "join" },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (error) setError(null);
  };

  return (
    <OnboardingFormScreen
      artworkSource={joinHouseholdArtwork}
      title="Join your household"
      description="Enter the 6-character code shared with you."
      onBack={() => router.back()}
      footer={
        <Button
          onPress={handleJoin}
          loading={isJoining}
          disabled={isJoining || code.length !== 6}
          size="lg"
          className="w-full"
          accessibilityLabel="Join household"
          forceSolid
        >
          Join household
        </Button>
      }
    >
      <View>
        <CodeInput
          value={code}
          onChange={handleCodeChange}
          length={6}
          error={!!error}
        />

        {error ? (
          <Animated.Text
            entering={ERROR_ENTER}
            className="mt-4 text-center text-sm leading-5 text-red-700"
            accessibilityRole="alert"
          >
            {error}
          </Animated.Text>
        ) : (
          <Text className="mt-4 text-center text-sm leading-5 text-warm-gray-500">
            Six letters and numbers, like ABC123
          </Text>
        )}

        <View className="mt-5 items-center">
          <Pressable
            onPress={() => router.back()}
            className="min-h-11 justify-center py-2"
            accessibilityLabel="Create your own household instead"
            accessibilityRole="link"
          >
            <Text className="text-base text-ink-secondary">
              Don't have a code?{" "}
              <Text className="font-semibold text-teal">
                Create a household
              </Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </OnboardingFormScreen>
  );
}
