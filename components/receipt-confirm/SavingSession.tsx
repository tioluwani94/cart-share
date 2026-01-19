import { AnimatedDot } from "@/components/receipt-confirm/AnimatedDot";
import { ShoppingCart } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

export const SavingSession = () => {
  return (
    <Animated.View entering={FadeIn.duration(300)} className="items-center">
      {/* Saving animation */}
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-teal/20">
        <ShoppingCart size={48} color="#4ECDC4" strokeWidth={1.5} />
      </View>

      <Text className="text-center text-xl font-bold text-warm-gray-900">
        Saving your trip...
      </Text>

      {/* Animated dots */}
      <View className="mt-4 flex-row">
        {[0, 1, 2].map((i) => (
          <AnimatedDot key={i} delay={i * 200} />
        ))}
      </View>
    </Animated.View>
  );
};
