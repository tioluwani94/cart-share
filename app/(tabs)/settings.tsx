import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-warm-gray-900">Settings</Text>
        <Text className="mt-1 text-warm-gray-600">
          Manage your household and account
        </Text>

        {/* Settings content will be added in US-042 */}
        <View className="mt-8 flex-1 items-center justify-center">
          <Text className="text-6xl">⚙️</Text>
          <Text className="mt-4 text-center text-lg text-warm-gray-600">
            Settings coming soon
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
