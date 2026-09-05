import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
import * as Haptics from "expo-haptics";
import { Archive } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Thresholds for swipe actions
const SWIPE_REVEAL_THRESHOLD = -40;
const ARCHIVE_THRESHOLD = -80;
const SWIPE_LIMIT = -104;
const EDGE_RESISTANCE = 0.14;
const VELOCITY_PROJECTION_SECONDS = 0.08;
const PRESS_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SWIPE_SETTLE = {
  duration: 260,
  dampingRatio: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

interface ListCardProps {
  id: Id<"lists">;
  name: string;
  category?: string;
  totalItems: number;
  completedItems: number;
  onPress?: () => void;
  onArchive?: (id: Id<"lists">) => void;
  index?: number;
}

/**
 * Format item count in a fun, friendly way.
 */
function formatItemCount(total: number, completed: number): string {
  if (total === 0) {
    return "No items yet";
  }
  if (completed === total) {
    return "All done!";
  }
  if (completed > 0) {
    return `${completed}/${total} done!`;
  }
  return `${total} item${total === 1 ? "" : "s"} to grab`;
}

/**
 * Get category emoji for visual flair.
 */
function getCategoryEmoji(category?: string): string {
  switch (category?.toLowerCase()) {
    case "groceries":
      return "🛒";
    case "tesco":
      return "🛍️";
    case "sainsburys":
      return "🧺";
    case "produce":
      return "🥬";
    case "dairy":
      return "🥛";
    case "meat":
      return "🥩";
    case "bakery":
      return "🥖";
    default:
      return "📝";
  }
}

export function ListCard({
  id,
  name,
  category,
  totalItems,
  completedItems,
  onPress,
  onArchive,
}: ListCardProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const hasTriggeredRevealHaptic = useSharedValue(false);
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const isComplete = totalItems > 0 && completedItems === totalItems;

  const triggerArchive = () => {
    if (onArchive) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // Haptics are supplementary; the archive action still completes.
      });
      onArchive(id);
    }
  };

  const triggerRevealHaptic = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Haptics are supplementary to the revealed archive surface.
    });
  };

  const panGesture = Gesture.Pan()
    .enabled(Boolean(onArchive))
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const proposedPosition = Math.min(0, event.translationX);
      const nextPosition =
        proposedPosition < SWIPE_LIMIT
          ? SWIPE_LIMIT + (proposedPosition - SWIPE_LIMIT) * EDGE_RESISTANCE
          : proposedPosition;
      translateX.set(nextPosition);

      // Trigger haptic on reveal
      if (
        translateX.get() < SWIPE_REVEAL_THRESHOLD &&
        !hasTriggeredRevealHaptic.get()
      ) {
        hasTriggeredRevealHaptic.set(true);
        scheduleOnRN(triggerRevealHaptic);
      } else if (translateX.get() >= SWIPE_REVEAL_THRESHOLD) {
        hasTriggeredRevealHaptic.set(false);
      }
    })
    .onEnd((event) => {
      const projectedPosition =
        translateX.get() + event.velocityX * VELOCITY_PROJECTION_SECONDS;
      if (projectedPosition < ARCHIVE_THRESHOLD && onArchive) {
        scheduleOnRN(triggerArchive);
      }
      translateX.set(
        withSpring(0, {
          ...SWIPE_SETTLE,
          velocity: event.velocityX,
        }),
      );
      hasTriggeredRevealHaptic.set(false);
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { translateX: translateX.get() }],
  }));

  const archiveBackgroundStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(
      translateX.get(),
      [0, ARCHIVE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: interpolate(
        translateX.get(),
        [0, -20],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      backgroundColor: interpolateColor(
        swipeProgress,
        [0, 1],
        ["#FED7AA", "#F97316"],
      ),
    };
  });

  const archiveIconStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateX.get(),
        [0, -30],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  const handlePressIn = () => {
    scale.set(
      reduceMotion
        ? 1
        : withTiming(0.97, { duration: 100, easing: PRESS_EASE_OUT }),
    );
  };

  const handlePressOut = () => {
    scale.set(
      reduceMotion
        ? 1
        : withTiming(1, { duration: 140, easing: PRESS_EASE_OUT }),
    );
  };

  return (
    <View className="mb-3">
      {/* Archive background */}
      <Animated.View
        style={archiveBackgroundStyle}
        className="absolute inset-0 items-end justify-center rounded-2xl pr-6"
      >
        <Animated.View style={archiveIconStyle}>
          <Archive className="w-3 h-3" color="white" strokeWidth={2} />
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <AnimatedPressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={cardAnimatedStyle}
          accessibilityRole="button"
          accessibilityLabel={`${name} list, ${formatItemCount(totalItems, completedItems)}${onArchive ? ". Swipe left to archive." : "."}`}
          className={cn("rounded-2xl bg-white p-4", "shadow-warm")}
        >
          {/* Header row */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <Text className="mr-2 text-2xl">
                {getCategoryEmoji(category)}
              </Text>
              <Text
                className="flex-1 text-lg font-semibold text-warm-gray-900"
                numberOfLines={1}
              >
                {name}
              </Text>
            </View>
            {isComplete && (
              <View className="rounded-full bg-teal/10 px-2 py-1">
                <Text className="text-xs font-medium text-teal">Complete</Text>
              </View>
            )}
          </View>

          {/* Item count */}
          <Text className="mt-2 text-sm text-warm-gray-600">
            {formatItemCount(totalItems, completedItems)}
          </Text>

          {/* Progress bar */}
          {totalItems > 0 && (
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-warm-gray-100">
              <Animated.View
                className={cn(
                  "h-full rounded-full",
                  isComplete ? "bg-teal" : "bg-teal",
                )}
                style={{ width: `${progress}%` }}
              />
            </View>
          )}
        </AnimatedPressable>
      </GestureDetector>
    </View>
  );
}
