import { Button } from "@/components/ui/Button";
import { CodeInput } from "@/components/ui/CodeInput";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [showCelebration, setShowCelebration] = useState(false);
  const [householdName, setHouseholdName] = useState("");

  // Celebration animation values
  const celebrationScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError("Please enter all 6 characters");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await joinHousehold({ inviteCode: code });
      setHouseholdName(result.householdName);

      // Trigger celebration
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCelebration(true);

      // Animate celebration
      celebrationScale.value = withSpring(1, { damping: 10, stiffness: 100 });
      confettiOpacity.value = withTiming(1, { duration: 300 });

      // Navigate after celebration
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 2500);
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
    // Clear error when user starts typing again
    if (error) setError(null);
  };

  // Celebration screen
  if (showCelebration) {
    return (
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center px-6">
          {/* Confetti particles */}
          <ConfettiParticles />

          {/* Celebration content */}
          <Animated.View
            entering={ZoomIn.delay(100).springify().damping(90)}
            className="items-center"
          >
            <Text className="text-7xl">🎊</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(300).springify().damping(90)}
            className="mt-6 items-center"
          >
            <Text className="text-center text-3xl font-bold text-warm-gray-900">
              Welcome to the family!
            </Text>
            <Text className="mt-3 text-center text-xl text-warm-gray-600">
              You've joined {householdName}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(500).springify().damping(90)}
            className="mt-8 flex-row items-center gap-3"
          >
            <Text className="text-4xl">🛒</Text>
            <Text className="text-4xl">💕</Text>
            <Text className="text-4xl">🛒</Text>
          </Animated.View>

          <Animated.Text
            entering={FadeIn.delay(800)}
            className="mt-8 text-center text-warm-gray-500"
          >
            Heading to your lists...
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }

  // Join form screen
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-6 pt-8">
        {/* Back button */}
        <Animated.View entering={FadeIn.delay(100)}>
          <Pressable
            onPress={() => router.back()}
            className="mb-4 h-10 w-10 items-center justify-center self-start rounded-full bg-warm-gray-100"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ChevronLeft size={24} color="#57534E" strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Header */}
        <Animated.View
          entering={FadeInUp.delay(100).springify().damping(90)}
          className="items-center"
        >
          <Text className="text-5xl">🔑</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(200).springify().damping(90)}
          className="mt-6 items-center"
        >
          <Text className="text-center text-3xl font-bold text-warm-gray-900">
            Join your partner's{"\n"}household
          </Text>
          <Text className="mt-3 text-center text-lg text-warm-gray-600">
            Enter the 6-character code they shared with you
          </Text>
        </Animated.View>

        {/* Code Input */}
        <Animated.View
          entering={FadeInUp.delay(300).springify().damping(90)}
          className="mt-10"
        >
          <CodeInput
            value={code}
            onChange={handleCodeChange}
            length={6}
            error={!!error}
          />

          {/* Error Message */}
          {error && (
            <Animated.Text
              entering={FadeIn}
              className="mt-4 text-center text-base text-coral"
            >
              {error}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Helper Text */}
        <Animated.View
          entering={FadeInUp.delay(400).springify().damping(90)}
          className="mt-6"
        >
          <Text className="text-center text-sm text-warm-gray-500">
            The code is 6 letters and numbers, like ABC123
          </Text>
        </Animated.View>

        {/* Join Button */}
        <Animated.View
          entering={FadeInDown.delay(500).springify().damping(90)}
          className="mt-8"
        >
          <Button
            onPress={handleJoin}
            loading={isJoining}
            disabled={isJoining || code.length !== 6}
            size="lg"
            className="w-full"
            accessibilityLabel="Join household"
          >
            Join Household
          </Button>
        </Animated.View>

        {/* Create option */}
        <Animated.View
          entering={FadeInDown.delay(600).springify().damping(90)}
          className="mt-6 items-center"
        >
          <Pressable
            onPress={() => router.back()}
            className="py-2"
            accessibilityLabel="Create your own household instead"
            accessibilityRole="link"
          >
            <Text className="text-base text-warm-gray-600">
              Don't have a code?{" "}
              <Text className="font-semibold text-teal">
                Create a household
              </Text>
            </Text>
          </Pressable>
        </Animated.View>

        {/* Decorative Footer */}
        <View className="mt-auto items-center pb-8">
          <Text className="text-4xl opacity-20">🏠 💑 🛒</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Simple confetti particles for celebration effect.
 */
function ConfettiParticles() {
  const particles = [
    { emoji: "🎉", delay: 0, x: -80, y: -100 },
    { emoji: "✨", delay: 100, x: 80, y: -120 },
    { emoji: "🎊", delay: 200, x: -60, y: -80 },
    { emoji: "💫", delay: 150, x: 70, y: -90 },
    { emoji: "🌟", delay: 250, x: -40, y: -110 },
  ];

  return (
    <View className="absolute inset-0 items-center justify-center">
      {particles.map((particle, index) => (
        <ConfettiParticle
          key={index}
          emoji={particle.emoji}
          delay={particle.delay}
          initialX={particle.x}
          initialY={particle.y}
        />
      ))}
    </View>
  );
}

interface ConfettiParticleProps {
  emoji: string;
  delay: number;
  initialX: number;
  initialY: number;
}

function ConfettiParticle({
  emoji,
  delay,
  initialX,
  initialY,
}: ConfettiParticleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(initialX);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Start animation after delay
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 8, stiffness: 100 }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(initialY + 200, {
        duration: 2000,
        easing: Easing.out(Easing.cubic),
      }),
    );
    rotate.value = withDelay(
      delay,
      withTiming(360, { duration: 2000, easing: Easing.linear }),
    );

    // Fade out at end
    opacity.value = withDelay(delay + 1500, withTiming(0, { duration: 500 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[animatedStyle, { pointerEvents: "none" }]}
      className="absolute"
    >
      <Text className="text-3xl">{emoji}</Text>
    </Animated.View>
  );
}
