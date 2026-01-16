import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Placeholder for household setup screen.
 * Will be fully implemented in US-009.
 */
export default function HouseholdSetupScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl font-bold text-coral">Welcome!</Text>
        <Text className="mt-4 text-center text-lg text-warm-gray-600">
          Let's set up your household
        </Text>
        <Text className="mt-8 text-center text-sm text-warm-gray-400">
          Household setup will be implemented in US-009
        </Text>
      </View>
    </SafeAreaView>
  );
}
