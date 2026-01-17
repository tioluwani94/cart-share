import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Camera } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

/**
 * Placeholder screen for receipt scanning.
 * Full implementation in US-034.
 */
export default function ScanReceiptScreen() {
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
          Scan Receipt
        </Text>
      </View>

      {/* Coming soon content */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="flex-1 items-center justify-center px-8"
      >
        <View className="h-24 w-24 items-center justify-center rounded-full bg-coral/20">
          <Camera size={48} color="#FF6B6B" strokeWidth={1.5} />
        </View>

        <Text className="mt-6 text-center text-2xl font-bold text-warm-gray-900">
          Coming Soon! 📸
        </Text>

        <Text className="mt-3 text-center text-base text-warm-gray-600">
          Snap your receipt to automatically track your spending and unlock
          insights.
        </Text>

        <Pressable
          onPress={() => router.back()}
          className="mt-8 rounded-2xl bg-coral px-8 py-4"
          accessibilityLabel="Go back to list"
        >
          <Text className="text-base font-semibold text-white">
            Back to List
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
