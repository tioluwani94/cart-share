import { View, Text, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { Id } from "@/convex/_generated/dataModel";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ListCardProps {
  id: Id<"lists">;
  name: string;
  category?: string;
  totalItems: number;
  completedItems: number;
  onPress?: () => void;
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
  index = 0,
}: ListCardProps) {
  const scale = useSharedValue(1);
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const isComplete = totalItems > 0 && completedItems === totalItems;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
        accessibilityRole="button"
        accessibilityLabel={`${name} list, ${formatItemCount(totalItems, completedItems)}`}
        className={cn(
          "mb-3 rounded-2xl bg-white p-4",
          "border-l-4 border-coral",
          "shadow-warm"
        )}
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <Text className="mr-2 text-2xl">{getCategoryEmoji(category)}</Text>
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
                isComplete ? "bg-teal" : "bg-teal"
              )}
              style={{ width: `${progress}%` }}
            />
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}
