import { InviteCode } from "@/components/household-setup/InviteCode";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
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
      setError(message);
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
      withSpring(1.1, { damping: 10 }),
      withSpring(1, { damping: 10 }),
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
      <View className="flex-1 px-6 pt-8">
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
          className="mt-6 items-center"
        >
          <Text className="text-center text-3xl font-bold text-warm-gray-900">
            Start your shopping{"\n"}adventure!
          </Text>
          <Text className="mt-3 text-center text-lg text-warm-gray-600">
            Create your household and invite your partner to shop together
          </Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View
          entering={FadeInUp.delay(300).springify().damping(90)}
          className="mt-10"
        >
          <Input
            label="Household Name"
            value={householdName}
            onChangeText={setHouseholdName}
            placeholder="The Smith Family"
            autoCapitalize="words"
            autoCorrect={false}
            error={error ?? undefined}
            keyboardType="default"
          />

          <Text className="mt-2 px-2 text-sm text-warm-gray-500">
            Give your household a fun name — this is what you'll see in the app!
          </Text>
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
          >
            Create Household
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
              Have a code?{" "}
              <Text className="font-semibold text-teal">Join a household</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
