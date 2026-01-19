import { Button } from "@/components/ui";
import { formatAmount } from "@/lib/formatAmount";
import { CheckCircle2, Edit3 } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

interface ScanSuccessProps {
  /** URI of the receipt photo to display */
  photoUri?: string;
  /** Extracted total amount in cents */
  extractedTotal: number | null;
  /** Handler for confirming the extracted total */
  handleConfirm: () => void;
  /** Handler for editing the extracted total */
  handleNotQuite: () => void;
}

export const ScanSuccess = (props: ScanSuccessProps) => {
  const { photoUri, extractedTotal, handleConfirm, handleNotQuite } = props;

  const totalScale = useSharedValue(0);
  const successScale = useSharedValue(0);
  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));
  const totalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: totalScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(90)}
      className="items-center"
    >
      {/* Success icon */}
      <Animated.View
        style={successAnimatedStyle}
        className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-teal/20"
      >
        <CheckCircle2 size={48} color="#4ECDC4" strokeWidth={2} />
      </Animated.View>

      <Text className="text-center text-xl font-bold text-warm-gray-900">
        Found it! 🎉
      </Text>

      {/* Large extracted total */}
      {extractedTotal !== null && (
        <Animated.View style={totalAnimatedStyle} className="my-6">
          <Text className="text-center text-5xl font-bold text-coral">
            {formatAmount(extractedTotal)}
          </Text>
        </Animated.View>
      )}

      {/* Receipt thumbnail */}
      {photoUri && (
        <View className="mb-6 h-28 w-28 overflow-hidden rounded-xl shadow-md">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Confirm button */}
      <Button
        size="lg"
        variant="primary"
        className="w-full"
        onPress={handleConfirm}
      >
        <View className="flex-row items-center">
          <CheckCircle2 size={20} color="white" strokeWidth={2} />
          <Text className="ml-2 text-base font-semibold text-white flex-1">
            That's right!
          </Text>
        </View>
      </Button>

      {/* Edit option */}
      <Pressable
        onPress={handleNotQuite}
        className="mt-4 flex-row items-center py-2"
        accessibilityLabel="Edit amount manually"
      >
        <Edit3 size={16} color="#6B6B6B" strokeWidth={2} />
        <Text className="ml-2 text-base text-warm-gray-600 underline">
          Not quite — let me fix it
        </Text>
      </Pressable>
    </Animated.View>
  );
};
