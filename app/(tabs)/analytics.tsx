import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AnalyticsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-warm-gray-900">Analytics</Text>
        <Text className="mt-1 text-warm-gray-600">
          Track your spending patterns
        </Text>

        {/* Analytics will be added in US-039 */}
        <View className="mt-8 flex-1 items-center justify-center">
          <Text className="text-6xl">📊</Text>
          <Text className="mt-4 text-center text-lg text-warm-gray-600">
            Scan your first receipt to unlock insights!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
