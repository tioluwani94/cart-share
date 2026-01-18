import * as Haptics from "expo-haptics";
import { Pressable, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Category options with playful icons.
 */
export const CATEGORIES = [
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "costco", label: "Costco", icon: "📦" },
  { id: "target", label: "Target", icon: "🎯" },
  { id: "pharmacy", label: "Pharmacy", icon: "💊" },
  { id: "other", label: "Other", icon: "📝" },
];

/**
 * Category chip component with selection animation.
 */
export function CategoryChip({
  label,
  icon,
  selected,
  onPress,
}: {
  id: string;
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      accessibilityLabel={`${label} category${selected ? ", selected" : ""}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`mr-2 mb-2 flex-row items-center rounded-full px-4 py-2.5 ${
        selected ? "bg-teal" : "border border-warm-gray-200 bg-white"
      }`}
    >
      <Text className="mr-1.5 text-lg">{icon}</Text>
      <Text
        className={`font-medium ${
          selected ? "text-white" : "text-warm-gray-700"
        }`}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
