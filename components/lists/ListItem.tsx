import { View, Text, Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";

interface ListItemProps {
  id: Id<"items">;
  name: string;
  quantity?: number;
  unit?: string;
  isCompleted: boolean;
  onToggle: (itemId: Id<"items">) => void;
  index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ListItem({
  id,
  name,
  quantity,
  unit,
  isCompleted,
  onToggle,
  index,
}: ListItemProps) {
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(isCompleted ? 1 : 0);
  const checkmarkProgress = useSharedValue(isCompleted ? 1 : 0);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
  };

  const handleToggle = () => {
    const newCompleted = !isCompleted;

    if (newCompleted) {
      // Checking animation
      scale.value = withSpring(1.05, { damping: 10, stiffness: 400 });
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      fillProgress.value = withTiming(1, { duration: 200 });
      checkmarkProgress.value = withTiming(1, { duration: 250 });
      runOnJS(triggerHaptic)();
    } else {
      // Unchecking animation
      fillProgress.value = withTiming(0, { duration: 150 });
      checkmarkProgress.value = withTiming(0, { duration: 100 });
    }

    onToggle(id);
  };

  const checkboxContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkboxFillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      ["transparent", "#FF6B6B"]
    ),
    borderColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      ["#D3D0C9", "#FF6B6B"]
    ),
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkProgress.value,
    transform: [
      { scale: checkmarkProgress.value },
      { rotate: `${-5 + checkmarkProgress.value * 5}deg` },
    ],
  }));

  // Format quantity display
  const quantityDisplay =
    quantity && quantity > 0
      ? unit
        ? `${quantity} ${unit}`
        : `x${quantity}`
      : null;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(300)}
      exiting={FadeOut.duration(200)}
      className="mb-3"
    >
      <Pressable
        onPress={handleToggle}
        className="flex-row items-center rounded-2xl bg-white px-4 py-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
        accessibilityLabel={`${name}${isCompleted ? ", checked" : ", unchecked"}`}
      >
        {/* Checkbox */}
        <AnimatedPressable
          onPress={handleToggle}
          style={checkboxContainerStyle}
          className="mr-4"
        >
          <Animated.View
            style={checkboxFillStyle}
            className="h-7 w-7 items-center justify-center rounded-full border-2"
          >
            <Animated.View style={checkmarkStyle}>
              <CheckIcon />
            </Animated.View>
          </Animated.View>
        </AnimatedPressable>

        {/* Item name and quantity */}
        <View className="flex-1 flex-row items-center">
          <Text
            className={`flex-1 text-base font-medium ${
              isCompleted
                ? "text-warm-gray-400 line-through"
                : "text-warm-gray-800"
            }`}
            style={isCompleted ? { opacity: 0.7 } : undefined}
            numberOfLines={2}
          >
            {name}
          </Text>

          {/* Quantity badge */}
          {quantityDisplay && (
            <View
              className={`ml-3 rounded-full px-3 py-1 ${
                isCompleted ? "bg-warm-gray-200" : "bg-teal/20"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isCompleted ? "text-warm-gray-400" : "text-teal"
                }`}
              >
                {quantityDisplay}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function CheckIcon() {
  return (
    <View className="h-3 w-3">
      <View
        className="absolute h-[2px] w-[6px] bg-white"
        style={{
          top: 7,
          left: 1,
          transform: [{ rotate: "45deg" }],
        }}
      />
      <View
        className="absolute h-[2px] w-[10px] bg-white"
        style={{
          top: 5,
          left: 3,
          transform: [{ rotate: "-45deg" }],
        }}
      />
    </View>
  );
}
