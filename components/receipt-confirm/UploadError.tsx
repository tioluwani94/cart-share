import { Button } from "@/components/ui";
import { router } from "expo-router";
import { Receipt, RotateCcw } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface UploadErrorProps {
  /** Error message to display */
  errorMessage?: string;
  /** Handler for retrying the upload */
  handleTryAgain: () => void;
}

export const UploadError = ({
  errorMessage,
  handleTryAgain,
}: UploadErrorProps) => {
  return (
    <Animated.View entering={FadeInDown.duration(400)} className="items-center">
      {/* Error illustration */}
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-coral/20">
        <Receipt size={48} color="#FF6B6B" strokeWidth={1.5} />
      </View>

      <Text className="text-center text-2xl font-bold text-warm-gray-900">
        Oops! Something went wrong
      </Text>

      <Text className="mt-2 text-center text-base text-warm-gray-600">
        {errorMessage || "We couldn't upload your receipt. Let's try again!"}
      </Text>

      {/* Retry button */}
      <Button
        variant="primary"
        size="lg"
        onPress={handleTryAgain}
        className="mt-8 w-full"
      >
        <View className="flex-row items-center">
          <RotateCcw size={20} color="white" strokeWidth={2} />
          <Text className="ml-2 text-base font-semibold text-white">
            Try Again
          </Text>
        </View>
      </Button>

      {/* Skip option */}
      <Button
        variant="ghost"
        size="md"
        onPress={() => router.replace("/(tabs)")}
        className="mt-4"
      >
        Skip for now
      </Button>
    </Animated.View>
  );
};
