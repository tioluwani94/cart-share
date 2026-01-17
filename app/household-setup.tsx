import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
      const message = err instanceof Error ? err.message : "Something went wrong";
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
      withSpring(1, { damping: 10 })
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
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 px-6 pt-8">
          {/* Celebration Header */}
          <Animated.View
            entering={FadeInUp.delay(100).springify()}
            className="items-center"
          >
            <Text className="text-6xl">🎉</Text>
            <Text className="mt-4 text-center text-3xl font-bold text-warm-gray-900">
              You're all set!
            </Text>
            <Text className="mt-2 text-center text-lg text-warm-gray-600">
              Welcome to {householdName}
            </Text>
          </Animated.View>

          {/* Invite Code Card */}
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            className="mt-10 rounded-3xl bg-white p-6 shadow-lg"
          >
            <Text className="text-center text-lg font-medium text-warm-gray-600">
              Share this code with your partner!
            </Text>

            {/* Large Invite Code Display */}
            <View className="mt-4 rounded-2xl bg-warm-gray-50 py-6">
              <Text
                className="text-center text-4xl font-bold tracking-[8px] text-coral"
                accessibilityLabel={`Invite code: ${inviteCode.split("").join(" ")}`}
              >
                {inviteCode}
              </Text>
            </View>

            {/* Copy Button */}
            <Animated.View style={copyAnimatedStyle} className="mt-4">
              <Pressable
                onPress={handleCopyCode}
                className="flex-row items-center justify-center rounded-xl bg-teal/10 py-3"
                accessibilityLabel={copied ? "Copied to clipboard" : "Copy invite code"}
                accessibilityRole="button"
              >
                <Text className="text-lg font-semibold text-teal">
                  {copied ? "Copied! ✓" : "Copy Code"}
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>

          {/* Partner Instructions */}
          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            className="mt-6 rounded-2xl bg-yellow/10 p-4"
          >
            <Text className="text-center text-warm-gray-700">
              💡 Your partner can join by entering this code when they sign up!
            </Text>
          </Animated.View>

          {/* Continue Button */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            className="mt-auto pb-8"
          >
            <Button onPress={handleContinue} size="lg" className="w-full">
              Let's Go Shopping!
            </Button>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Initial creation screen
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-6 pt-8">
        {/* Playful Illustration */}
        <Animated.View
          entering={FadeInUp.delay(100).springify()}
          className="items-center"
        >
          <View className="flex-row">
            <Text className="text-5xl">🏠</Text>
            <Text className="ml-2 text-5xl">💑</Text>
          </View>
        </Animated.View>

        {/* Welcome Header */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
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
          entering={FadeInUp.delay(300).springify()}
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
          />

          <Text className="mt-2 px-2 text-sm text-warm-gray-500">
            Give your household a fun name — this is what you'll see in the app!
          </Text>
        </Animated.View>

        {/* Create Button */}
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
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
          entering={FadeInDown.delay(500).springify()}
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

        {/* Decorative Footer */}
        <View className="mt-auto items-center pb-8">
          <Text className="text-4xl opacity-20">🛒 🥑 🍞</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
