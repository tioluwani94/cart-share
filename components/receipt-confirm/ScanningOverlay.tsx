import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

export const ScanningOverlay = () => {
  const scanOpacity = useSharedValue(0);
  const scanLinePosition = useSharedValue(0);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePosition.value }],
    opacity: scanOpacity.value,
  }));

  return (
    <View className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* Scan line */}
      <Animated.View
        style={scanLineStyle}
        className="absolute left-0 right-0 h-1 bg-teal shadow-lg"
      />
      {/* Corner accents */}
      <View className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-teal rounded-tl-lg" />
      <View className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-teal rounded-tr-lg" />
      <View className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-teal rounded-bl-lg" />
      <View className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-teal rounded-br-lg" />
      {/* Subtle overlay */}
      <View className="absolute inset-0 bg-teal/10" />
    </View>
  );
};
