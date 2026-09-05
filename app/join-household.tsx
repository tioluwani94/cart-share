import createHouseholdArtwork from "@/assets/onboarding/household/create-household.png";
import joinHouseholdArtwork from "@/assets/onboarding/household/join-household.png";
import { OnboardingFormScreen } from "@/components/onboarding/OnboardingFormScreen";
import { Button } from "@/components/ui/Button";
import { CodeInput } from "@/components/ui/CodeInput";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const MOTION_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const ERROR_ENTER = FadeIn.duration(150).easing(MOTION_EASE_OUT);
const SUCCESS_ENTER = FadeIn.duration(200).easing(MOTION_EASE_OUT);
const SUCCESS_DWELL_MS = 1200;

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [householdName, setHouseholdName] = useState("");

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError("Please enter all 6 characters");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await joinHousehold({ inviteCode: code });
      setHouseholdName(result.householdName);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccess(true);

      setTimeout(() => {
        router.replace({
          pathname: "/notification-setup",
          params: { origin: "join" },
        });
      }, SUCCESS_DWELL_MS);
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

  if (showSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <Animated.View
          entering={SUCCESS_ENTER}
          className="flex-1 items-center justify-center px-6"
        >
          <Image
            source={createHouseholdArtwork}
            contentFit="contain"
            style={{ width: 176, height: 176 }}
            accessible={false}
            accessibilityElementsHidden
          />
          <Text
            className="font-heading mt-5 text-center text-[34px] leading-[40px] tracking-tight text-ink"
            accessibilityRole="header"
          >
            You're in!
          </Text>
          <Text className="mt-3 text-center text-[17px] leading-[25px] text-ink-secondary">
            Welcome to {householdName}. We're preparing your shared plan.
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

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
