import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-light">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl font-bold text-coral">CartShare</Text>
        <Text className="mt-4 text-center text-lg text-warm-gray-600">
          Shop smarter, together
        </Text>

        {/* OAuth buttons will be added in US-006 */}
        <View className="mt-12 w-full">
          <View className="h-14 w-full items-center justify-center rounded-2xl bg-coral">
            <Text className="text-lg font-semibold text-white">
              Continue with Google
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
