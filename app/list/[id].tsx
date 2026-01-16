import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-warm-gray-900">
          Shopping List
        </Text>
        <Text className="mt-1 text-warm-gray-600">List ID: {id}</Text>

        {/* List items will be added in US-016 */}
        <View className="mt-8 flex-1 items-center justify-center">
          <Text className="text-6xl">📝</Text>
          <Text className="mt-4 text-center text-lg text-warm-gray-600">
            Items will appear here
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
