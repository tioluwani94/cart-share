import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background-light">
      <Text className="text-3xl font-bold text-coral">CartShare</Text>
      <Text className="mt-2 text-warm-gray-600">
        Shop smarter, together
      </Text>
    </View>
  );
}
