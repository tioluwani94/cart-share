import { View, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  runOnJS,
  FadeInDown,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Archive } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/cn";
import { Id } from "@/convex/_generated/dataModel";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Thresholds for swipe actions
const SWIPE_REVEAL_THRESHOLD = -40;
const ARCHIVE_THRESHOLD = -80;

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
    case "costco":
      return "📦";
    case "target":
      return "🎯";
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
  index = 0,
}: ListCardProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const hasTriggeredRevealHaptic = useSharedValue(false);
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const isComplete = totalItems > 0 && completedItems === totalItems;

  const triggerArchive = () => {
    if (onArchive) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onArchive(id);
    }
  };

  const triggerRevealHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Only allow swiping left
      translateX.value = Math.min(0, Math.max(event.translationX, -120));

      // Trigger haptic on reveal
      if (
        translateX.value < SWIPE_REVEAL_THRESHOLD &&
        !hasTriggeredRevealHaptic.value
      ) {
        hasTriggeredRevealHaptic.value = true;
        runOnJS(triggerRevealHaptic)();
      } else if (translateX.value >= SWIPE_REVEAL_THRESHOLD) {
        hasTriggeredRevealHaptic.value = false;
      }
    })
    .onEnd(() => {
      if (translateX.value < ARCHIVE_THRESHOLD && onArchive) {
        runOnJS(triggerArchive)();
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  const archiveBackgroundStyle = useAnimatedStyle(() => {
    const swipeProgress = interpolate(
      translateX.value,
      [0, ARCHIVE_THRESHOLD],
      [0, 1],
    );

    return {
      opacity: interpolate(translateX.value, [0, -20], [0, 1]),
      backgroundColor: interpolateColor(
        swipeProgress,
        [0, 1],
        ["#FED7AA", "#F97316"],
      ),
    };
  });

  const archiveIconStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(translateX.value, [0, -30], [0, 1]),
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)
        .duration(400)
        .springify()
        .damping(15)}
      className="mb-3"
    >
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
          accessibilityLabel={`${name} list, ${formatItemCount(totalItems, completedItems)}. Swipe left to archive.`}
          className={cn(
            "rounded-2xl bg-white p-4",
            "border-l-4 border-coral",
            "shadow-warm",
          )}
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
    </Animated.View>
  );
}
