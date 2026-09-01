import { themeColors } from "@/lib/theme";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export const ScanningOverlay = () => {
  const reduceMotion = useReducedMotion();
  const scanOpacity = useSharedValue(reduceMotion ? 0.65 : 0);
  const scanLinePosition = useSharedValue(reduceMotion ? 96 : 4);

  useEffect(() => {
    if (reduceMotion) {
      scanOpacity.set(0.65);
      scanLinePosition.set(96);
      return;
    }

    scanOpacity.set(
      withTiming(0.85, { duration: 180, reduceMotion: ReduceMotion.System }),
    );
    scanLinePosition.set(
      withRepeat(
        withSequence(
          withTiming(200, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(4, {
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            reduceMotion: ReduceMotion.System,
          }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(scanOpacity);
      cancelAnimation(scanLinePosition);
    };
  }, [reduceMotion, scanLinePosition, scanOpacity]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.get() }],
    opacity: scanOpacity.get(),
  }));

  return (
    <View className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Scan line */}
      <Animated.View
        style={[scanLineStyle, { backgroundColor: themeColors.teal }]}
        className="absolute left-2 right-2 h-0.5 rounded-full"
      />
      {/* Corner accents */}
      <View className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-teal rounded-tl-lg" />
      <View className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-teal rounded-tr-lg" />
      <View className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-teal rounded-bl-lg" />
      <View className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-teal rounded-br-lg" />
      {/* Subtle overlay */}
      <View className="absolute inset-0 bg-teal/5" />
    </View>
  );
};
