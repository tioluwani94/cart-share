import { useEffect } from "react";
import { Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface ToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ visible, message, onDismiss, duration = 2000 }: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Slide in from top with spring
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      opacity.value = withSpring(1);

      // Light haptic on show
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto dismiss after duration
      const timeout = setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 300 });
        opacity.value = withDelay(
          200,
          withTiming(0, { duration: 100 }, () => {
            runOnJS(onDismiss)();
          })
        );
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      translateY.value = -100;
      opacity.value = 0;
    }
  }, [visible, duration, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={animatedStyle}
      className="absolute left-4 right-4 top-16 z-50"
    >
      <Animated.View className="flex-row items-center justify-center rounded-2xl bg-warm-gray-900 px-6 py-4 shadow-lg">
        <Text className="text-center text-base font-semibold text-white">
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
