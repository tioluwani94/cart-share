import { InviteCode } from "@/components/household-setup/InviteCode";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/convex/_generated/api";
import { useConvex, useMutation } from "convex/react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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

  // Animation for copy success
  const copyScale = useSharedValue(1);
  const copyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: copyScale.value }],
  }));

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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate the copy button
    copyScale.value = withSequence(
      withSpring(1.1, { damping: 90 }),
      withSpring(1, { damping: 90 }),
    );

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
        copyAnimatedStyle={copyAnimatedStyle}
        handleContinue={handleContinue}
        handleCopyCode={handleCopyCode}
      />
    );
  }

  // Initial creation screen
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-6 pt-10">
        {/* Playful Illustration */}
        <Animated.View
          entering={FadeInUp.delay(100).springify().damping(90)}
          className="items-center"
        >
          <View className="flex-row">
            <Text className="text-5xl">🏠</Text>
          </View>
        </Animated.View>

        {/* Welcome Header */}
        <Animated.View
          entering={FadeInUp.delay(200).springify().damping(90)}
          className="mt-7 items-center"
        >
          <Text
            className="text-center text-[34px] leading-[40px] tracking-tight text-warm-gray-900"
            style={{ fontFamily: "Nunito_900Black" }}
          >
            Name your household
          </Text>
          <Text className="mt-3 text-center text-base leading-6 text-warm-gray-600">
            Keep everyone's grocery plan in one place.
          </Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View
          entering={FadeInUp.delay(300).springify().damping(90)}
          className="mt-12"
        >
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
        </Animated.View>

        {/* Create Button */}
        <Animated.View
          entering={FadeInDown.delay(400).springify().damping(90)}
          className="mt-8"
        >
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
        </Animated.View>

        {/* Join Option */}
        <Animated.View
          entering={FadeInDown.delay(500).springify().damping(90)}
          className="mt-6 items-center"
        >
          <Pressable
            onPress={() => router.push("/join-household")}
            className="py-2"
            accessibilityLabel="Join an existing household with an invite code"
            accessibilityRole="link"
          >
            <Text className="text-base text-warm-gray-600">
              Have an invite code?{" "}
              <Text className="font-semibold text-teal">Join instead</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
