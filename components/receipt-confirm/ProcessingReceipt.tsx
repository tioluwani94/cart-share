import { Image, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AnimatedDot } from "./AnimatedDot";
import { PropsWithChildren } from "react";

interface ProcessingReceiptProps extends PropsWithChildren {
  photoUri?: string;
}

export const ProcessingReceipt = ({
  photoUri,
  children,
}: ProcessingReceiptProps) => {
  return (
    <Animated.View entering={FadeIn.duration(400)} className="items-center">
      {/* Receipt preview with scanning effect */}
      {photoUri && (
        <View className="relative mb-8 h-56 w-44 overflow-hidden rounded-2xl shadow-lg">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          {children}
        </View>
      )}

      <Text className="text-xl font-bold text-warm-gray-900">
        Reading your receipt...
      </Text>

      <Text className="mt-2 text-center text-sm text-warm-gray-500">
        Looking for the total amount
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
