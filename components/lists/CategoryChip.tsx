import * as Haptics from "expo-haptics";
import {
  Check,
  List,
  type LucideIcon,
  Pill,
  ShoppingBasket,
  Store,
} from "lucide-react-native";
import { Pressable, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Category options with playful icons.
 */
export const CATEGORIES: {
  id: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "groceries", label: "Groceries", icon: ShoppingBasket },
  { id: "tesco", label: "Tesco", icon: Store },
  { id: "sainsburys", label: "Sainsbury's", icon: Store },
  { id: "pharmacy", label: "Pharmacy", icon: Pill },
  { id: "other", label: "Other", icon: List },
];

/**
 * Category chip component with selection animation.
 */
export function CategoryChip({
  label,
  icon: Icon,
  selected,
  onPress,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!reduceMotion) {
      scale.value = withSpring(0.97, { damping: 28, stiffness: 520 });
    }
  };

  const handlePressOut = () => {
    scale.value = reduceMotion
      ? 1
      : withSpring(1, { damping: 28, stiffness: 520 });
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
      className={cn(
        "min-h-12 flex-row items-center rounded-full border px-4",
        selected
          ? "border-coral/30 bg-coral-soft"
          : "border-separator bg-surface",
      )}
    >
      <Icon
        size={18}
        color={selected ? themeColors.coral : themeColors.secondaryInk}
        strokeWidth={2}
      />
      <Text
        className={cn(
          "ml-2 font-semibold",
          selected ? "text-coral" : "text-ink-secondary",
        )}
      >
        {label}
      </Text>
      {selected && (
        <Check
          size={16}
          color={themeColors.coral}
          strokeWidth={2.5}
          style={{ marginLeft: 8 }}
        />
      )}
    </AnimatedPressable>
  );
}
