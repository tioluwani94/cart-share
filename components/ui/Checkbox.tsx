import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  runOnJS,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";
import * as Haptics from "expo-haptics";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  accessibilityLabel = "Checkbox",
}: CheckboxProps) {
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(checked ? 1 : 0);
  const checkmarkProgress = useSharedValue(checked ? 1 : 0);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available (e.g., web or simulator)
    }
  };

  const handlePress = () => {
    if (disabled) return;

    const newChecked = !checked;

    if (newChecked) {
      // Checking animation: scale bounce + fill + checkmark
      scale.value = withSequence(
        withSpring(1.1, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
      fillProgress.value = withTiming(1, { duration: 200 });
      checkmarkProgress.value = withTiming(1, { duration: 250 });
      runOnJS(triggerHaptic)();
    } else {
      // Unchecking animation
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      fillProgress.value = withTiming(0, { duration: 150 });
      checkmarkProgress.value = withTiming(0, { duration: 100 });
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }

    onCheckedChange(newChecked);
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
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

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkProgress.value,
    transform: [
      { scale: checkmarkProgress.value },
      { rotate: `${-5 + checkmarkProgress.value * 5}deg` },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={containerAnimatedStyle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "h-[28px] w-[28px] items-center justify-center",
        disabled && "opacity-50",
        className
      )}
    >
      <Animated.View
        style={fillAnimatedStyle}
        className="h-6 w-6 items-center justify-center rounded-lg border-2"
      >
        <Animated.View style={checkmarkAnimatedStyle}>
          <CheckIcon />
        </Animated.View>
      </Animated.View>
    </AnimatedPressable>
  );
}

function CheckIcon() {
  return (
    <View className="h-3 w-3">
      {/* Simple checkmark using Views */}
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
