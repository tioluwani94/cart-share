import { Button } from "@/components/ui";
import { themeColors } from "@/lib/theme";
import * as Haptics from "expo-haptics";
import { Camera, CircleCheck } from "lucide-react-native";
import { useCallback, useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const ENTER_DURATION = 220;
const EXIT_DURATION = 150;
const AUTO_DISMISS_DURATION = 1800;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

interface CompletionCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
  onScanReceipt?: () => void;
}

/**
 * A restrained completion moment for the end of a shopping trip.
 * The acknowledgement is immediate, readable, and never blocks the next task.
 */
export function CompletionCelebration({
  visible,
  onDismiss,
  onScanReceipt,
}: CompletionCelebrationProps) {
  const reduceMotion = useReducedMotion();
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(reduceMotion ? 0 : 8);
  const badgeScale = useSharedValue(reduceMotion ? 1 : 0.96);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    cancelAnimation(contentOpacity);
    cancelAnimation(contentTranslateY);
    cancelAnimation(badgeScale);

    if (!visible) {
      contentOpacity.set(0);
      contentTranslateY.set(reduceMotion ? 0 : 8);
      badgeScale.set(reduceMotion ? 1 : 0.96);
      return;
    }

    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {
      // Haptics are supplementary; the visible confirmation is authoritative.
    });

    contentOpacity.set(
      withTiming(1, {
        duration: reduceMotion ? 120 : ENTER_DURATION,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.System,
      }),
    );
    contentTranslateY.set(
      reduceMotion
        ? 0
        : withTiming(0, {
            duration: ENTER_DURATION,
            easing: EASE_OUT,
            reduceMotion: ReduceMotion.System,
          }),
    );
    badgeScale.set(
      reduceMotion
        ? 1
        : withTiming(1, {
            duration: ENTER_DURATION,
            easing: EASE_OUT,
            reduceMotion: ReduceMotion.System,
          }),
    );

    if (!onScanReceipt) {
      const timer = setTimeout(
        () => dismissRef.current(),
        AUTO_DISMISS_DURATION,
      );
      return () => clearTimeout(timer);
    }
  }, [
    badgeScale,
    contentOpacity,
    contentTranslateY,
    onScanReceipt,
    reduceMotion,
    visible,
  ]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.get(),
    transform: [{ translateY: contentTranslateY.get() }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.get() }],
  }));

  const handleScanReceipt = useCallback(() => {
    onDismiss();
    onScanReceipt?.();
  }, [onDismiss, onScanReceipt]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(EXIT_DURATION)
        .easing(EASE_OUT)
        .reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(EXIT_DURATION)
        .easing(EASE_OUT)
        .reduceMotion(ReduceMotion.System)}
      className="absolute inset-0 z-50 items-center justify-center bg-black/30 px-6"
    >
      <Pressable
        onPress={onDismiss}
        className="absolute inset-0"
        accessibilityLabel="Dismiss completion message"
        accessibilityRole="button"
      />

      <Animated.View
        style={[{ width: "100%", maxWidth: 360 }, contentStyle]}
        className="items-center rounded-[32px] border border-separator bg-surface px-6 py-7 shadow-lg"
        accessibilityRole="summary"
        accessibilityLiveRegion="polite"
        accessibilityLabel="Shopping list complete. Everything on your list is picked up."
      >
        <Animated.View
          style={badgeStyle}
          className="h-20 w-20 items-center justify-center rounded-3xl bg-teal-soft"
          accessible={false}
        >
          <CircleCheck size={42} color={themeColors.teal} strokeWidth={2.25} />
        </Animated.View>

        <Text
          className="mt-5 text-center text-2xl font-heading leading-8 text-ink"
          accessibilityRole="header"
        >
          List complete
        </Text>
        <Text className="mt-2 text-center text-base leading-6 text-ink-secondary">
          Everything on your list is picked up.
        </Text>

        {onScanReceipt ? (
          <>
            <Button
              className="mt-6 w-full"
              size="lg"
              onPress={handleScanReceipt}
              accessibilityLabel="Scan receipt"
            >
              <View className="flex-row items-center">
                <Camera
                  size={20}
                  color={themeColors.surface}
                  strokeWidth={2.25}
                />
                <Text className="ml-2 font-heading text-base text-white">
                  Scan receipt
                </Text>
              </View>
            </Button>
            <Button className="mt-2 w-full" variant="ghost" onPress={onDismiss}>
              Not now
            </Button>
          </>
        ) : (
          <Button className="mt-6 w-full" onPress={onDismiss}>
            Done
          </Button>
        )}
      </Animated.View>
    </Animated.View>
  );
}
