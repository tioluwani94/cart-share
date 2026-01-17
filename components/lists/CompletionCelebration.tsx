import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { Camera } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const CONFETTI_EMOJIS = ["🎉", "✨", "🎊", "💫", "🌟", "⭐", "🥳", "🎈"];

interface ConfettiParticleProps {
  emoji: string;
  index: number;
  total: number;
}

function ConfettiParticle({ emoji, index, total }: ConfettiParticleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Calculate position around a circle
  const angle = (index / total) * Math.PI * 2;
  const radius = 120 + Math.random() * 60;
  const targetX = Math.cos(angle) * radius;
  const targetY = Math.sin(angle) * radius - 50; // Bias upward

  useEffect(() => {
    const delay = index * 30;

    opacity.value = withDelay(delay, withTiming(1, { duration: 150 }));
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.2, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      )
    );
    translateX.value = withDelay(
      delay,
      withSpring(targetX, { damping: 12, stiffness: 80 })
    );
    translateY.value = withDelay(
      delay,
      withSpring(targetY, { damping: 12, stiffness: 80 })
    );
    rotate.value = withDelay(
      delay,
      withTiming(360 + Math.random() * 180, { duration: 1000 })
    );

    // Fade out after burst
    opacity.value = withDelay(
      delay + 800,
      withTiming(0, { duration: 400 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Text
      style={[
        {
          position: "absolute",
          fontSize: 24,
        },
        animatedStyle,
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

interface CompletionCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
  onScanReceipt?: () => void;
}

export function CompletionCelebration({
  visible,
  onDismiss,
  onScanReceipt,
}: CompletionCelebrationProps) {
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Trigger success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate check mark
      checkOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
      checkScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.2, { damping: 8, stiffness: 300 }),
          withSpring(1, { damping: 12, stiffness: 200 })
        )
      );

      // Show button after celebration
      buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 300 }));

      // Auto-dismiss after 2 seconds (but keep scan receipt option visible)
      const timer = setTimeout(() => {
        if (!onScanReceipt) {
          onDismiss();
        }
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      checkScale.value = 0;
      checkOpacity.value = 0;
      buttonOpacity.value = 0;
    }
  }, [visible]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  if (!visible) return null;

  // Generate confetti particles
  const confettiParticles = [];
  for (let i = 0; i < 16; i++) {
    const emoji = CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length];
    confettiParticles.push(
      <ConfettiParticle key={i} emoji={emoji} index={i} total={16} />
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-50 items-center justify-center bg-black/40"
    >
      <Pressable
        onPress={onDismiss}
        className="absolute inset-0"
        accessibilityLabel="Dismiss celebration"
      />

      {/* Celebration content */}
      <View className="items-center">
        {/* Confetti burst */}
        <View className="relative h-48 w-48 items-center justify-center">
          {confettiParticles}

          {/* Center check circle */}
          <Animated.View
            style={checkStyle}
            className="h-24 w-24 items-center justify-center rounded-full bg-teal"
          >
            <Text className="text-4xl">✓</Text>
          </Animated.View>
        </View>

        {/* Message */}
        <Animated.Text
          entering={FadeIn.delay(300).duration(300)}
          className="mt-4 text-2xl font-bold text-white"
        >
          All done! 🎉
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(400).duration(300)}
          className="mt-2 text-base text-white/80"
        >
          Great job finishing your list!
        </Animated.Text>

        {/* Scan receipt button */}
        {onScanReceipt && (
          <Animated.View style={buttonStyle} className="mt-6">
            <Pressable
              onPress={() => {
                onDismiss();
                onScanReceipt();
              }}
              className="flex-row items-center rounded-2xl bg-coral px-6 py-4"
              accessibilityLabel="Scan receipt"
              accessibilityRole="button"
            >
              <Camera size={20} color="#FFFFFF" strokeWidth={2} />
              <Text className="ml-2 text-base font-semibold text-white">
                Scan Receipt
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Dismiss hint */}
        <Animated.Text
          entering={FadeIn.delay(1500).duration(300)}
          className="mt-4 text-sm text-white/60"
        >
          Tap anywhere to dismiss
        </Animated.Text>
      </View>
    </Animated.View>
  );
}
