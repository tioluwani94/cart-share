import { Button } from "@/components/ui";
import { ScreenState } from "@/types";
import { router } from "expo-router";
import { Edit3, Receipt, RotateCcw } from "lucide-react-native";
import { Image, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface OcrErrorProps {
  /** URI of the receipt photo to display */
  photoUri?: string;
  /** Error message to display */
  errorMessage?: string;
  /** Setter for updating the screen state */
  setScreenState: (state: ScreenState) => void;
  /** Ref for the manual amount input */
  inputRef: React.RefObject<TextInput | null>;
}

export const OcrError = (props: OcrErrorProps) => {
  const { photoUri, errorMessage, setScreenState, inputRef } = props;

  return (
    <Animated.View entering={FadeInDown.duration(400)} className="items-center">
      {/* Error illustration */}
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-coral/20">
        <Receipt size={40} color="#FF6B6B" strokeWidth={1.5} />
      </View>

      <Text className="text-center text-xl font-bold text-warm-gray-900">
        We couldn't read that 😅
      </Text>

      <Text className="mt-2 text-center text-base text-warm-gray-600 px-4">
        {errorMessage || "No worries! You can enter the total manually."}
      </Text>

      {/* Receipt preview */}
      {photoUri && (
        <View className="my-6 h-32 w-32 overflow-hidden rounded-xl shadow-md opacity-60">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Manual entry button */}
      <Button
        variant="primary"
        size="lg"
        onPress={() => {
          setScreenState("manual_entry");
          setTimeout(() => inputRef.current?.focus(), 300);
        }}
        className="w-full"
      >
        <View className="flex-row items-center">
          <Edit3 size={20} color="white" strokeWidth={2} />
          <Text className="ml-2 text-base font-semibold text-white">
            Enter it manually
          </Text>
        </View>
      </Button>

      {/* Retake option */}
      <Button
        variant="ghost"
        size="md"
        onPress={() => router.back()}
        className="mt-4"
      >
        <View className="flex-row items-center">
          <RotateCcw size={16} color="#6B6B6B" strokeWidth={2} />
          <Text className="ml-2 text-base text-warm-gray-600">
            Retake photo
          </Text>
        </View>
      </Button>

      {/* Skip option */}
      <Button
        variant="ghost"
        size="md"
        onPress={() => router.replace("/(tabs)")}
        className="mt-2"
      >
        Skip for now
      </Button>
    </Animated.View>
  );
};
