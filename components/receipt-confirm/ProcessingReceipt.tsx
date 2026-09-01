import { PropsWithChildren } from "react";
import { Image, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { AnimatedDot } from "./AnimatedDot";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

interface ProcessingReceiptProps extends PropsWithChildren {
  photoUri?: string;
}

export const ProcessingReceipt = ({
  photoUri,
  children,
}: ProcessingReceiptProps) => {
  return (
    <Animated.View entering={RECEIPT_STATE_ENTER} className="items-center">
      {photoUri && (
        <View className="relative mb-8 h-56 w-44 overflow-hidden rounded-2xl border border-separator bg-surface">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          {children}
        </View>
      )}

      <Text className="text-2xl font-heading text-ink">
        Reading your receipt…
      </Text>

      <Text className="mt-2 text-center text-[16px] leading-6 text-ink-secondary">
        Looking for the total amount
      </Text>

      <View className="mt-4 flex-row">
        {[0, 1, 2].map((i) => (
          <AnimatedDot key={i} delay={i * 200} />
        ))}
      </View>
    </Animated.View>
  );
};
