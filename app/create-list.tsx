import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui";

/**
 * Create list screen placeholder.
 * Full implementation in US-014.
 */
export default function CreateListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-6xl">📝</Text>
        <Text className="mt-4 text-center text-xl font-semibold text-warm-gray-900">
          Create List
        </Text>
        <Text className="mt-2 text-center text-warm-gray-500">
          Coming soon in US-014!
        </Text>
        <Button onPress={() => router.back()} className="mt-6">
          Go Back
        </Button>
      </View>
    </SafeAreaView>
  );
}
