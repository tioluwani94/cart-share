import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Placeholder for join household screen.
 * Will be fully implemented in US-010.
 */
export default function JoinHouseholdScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl">🔑</Text>
        <Text className="mt-4 text-center text-2xl font-bold text-warm-gray-900">
          Join a Household
        </Text>
        <Text className="mt-4 text-center text-lg text-warm-gray-600">
          Enter the invite code your partner shared with you
        </Text>
        <Text className="mt-8 text-center text-sm text-warm-gray-400">
          Join functionality will be implemented in US-010
        </Text>
      </View>
    </SafeAreaView>
  );
}
