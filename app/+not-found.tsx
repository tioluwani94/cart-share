import { View, Text, Pressable } from "react-native";
import { Link, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <SafeAreaView className="flex-1 bg-background-light">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-6xl">🛒</Text>
          <Text className="mt-4 text-2xl font-bold text-warm-gray-900">
            Page not found
          </Text>
          <Text className="mt-2 text-center text-warm-gray-600">
            Looks like this aisle doesn't exist!
          </Text>

          <Link href="/" asChild>
            <Pressable className="mt-8 rounded-2xl bg-coral px-8 py-4">
              <Text className="text-lg font-semibold text-white">
                Go back home
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}
