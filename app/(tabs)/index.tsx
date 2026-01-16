import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-warm-gray-900">
          Hey there!
        </Text>
        <Text className="mt-1 text-warm-gray-600">
          Your shopping lists will appear here
        </Text>

        {/* Lists will be added in US-012 */}
        <View className="mt-8 flex-1 items-center justify-center">
          <Text className="text-6xl">🛒</Text>
          <Text className="mt-4 text-center text-lg text-warm-gray-600">
            Your lists are feeling lonely!
          </Text>
          <Text className="mt-2 text-center text-warm-gray-500">
            Create your first list to get started
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
