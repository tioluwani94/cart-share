import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

/**
 * Success celebration overlay.
 */
export function SuccessCelebration({ listName }: { listName: string }) {
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 100, stiffness: 200 });
    checkScale.value = withDelay(
      200,
      withSpring(1, { damping: 100, stiffness: 300 }),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View className="items-center justify-center flex-1 py-12">
      <Animated.View
        style={containerStyle}
        className="items-center justify-center flex-1"
      >
        {/* Check circle */}
        <Animated.View
          style={checkStyle}
          className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-teal"
        >
          <Text className="text-3xl text-white">✓</Text>
        </Animated.View>

        <Animated.Text
          entering={FadeIn.delay(300).duration(400)}
          className="text-xl font-bold text-warm-gray-900"
        >
          List created!
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(400).duration(400)}
          className="mt-2 text-center text-warm-gray-600"
        >
          "{listName}" is ready for shopping 🛒
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
