import { View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Receipt } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

/**
 * Placeholder screen for receipt confirmation and OCR processing.
 * Full implementation in US-035, US-036, US-037.
 */
export default function ReceiptConfirmScreen() {
  const { photoUri, listId } = useLocalSearchParams<{
    photoUri?: string;
    listId?: string;
  }>();

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      {/* Header */}
      <View className="flex-row items-center border-b border-warm-gray-100 bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-warm-gray-100"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color="#57534E" strokeWidth={2} />
        </Pressable>
        <Text className="text-xl font-bold text-warm-gray-900">
          Confirm Receipt
        </Text>
      </View>

      {/* Coming soon content */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="flex-1 items-center justify-center px-8"
      >
        {photoUri ? (
          <View className="mb-6 h-48 w-48 overflow-hidden rounded-2xl">
            <Image
              source={{ uri: photoUri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-teal/20">
            <Receipt size={48} color="#4ECDC4" strokeWidth={1.5} />
          </View>
        )}

        <Text className="mt-6 text-center text-2xl font-bold text-warm-gray-900">
          Processing Coming Soon! 🔍
        </Text>

        <Text className="mt-3 text-center text-base text-warm-gray-600">
          Receipt OCR and total extraction will be added in the next update.
        </Text>

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          className="mt-8 rounded-2xl bg-coral px-8 py-4"
          accessibilityLabel="Go to home"
        >
          <Text className="text-base font-semibold text-white">
            Back to Home
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
