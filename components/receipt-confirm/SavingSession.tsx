import { AnimatedDot } from "@/components/receipt-confirm/AnimatedDot";
import { themeColors } from "@/lib/theme";
import { ShoppingCart } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

export const SavingSession = () => {
  return (
    <Animated.View entering={RECEIPT_STATE_ENTER} className="items-center">
      <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-teal-soft">
        <ShoppingCart size={30} color={themeColors.teal} strokeWidth={2} />
      </View>

      <Text className="text-center text-2xl font-heading text-ink">
        Saving your trip…
      </Text>

      <View className="mt-4 flex-row">
        {[0, 1, 2].map((i) => (
          <AnimatedDot key={i} delay={i * 200} />
        ))}
      </View>
    </Animated.View>
  );
};
