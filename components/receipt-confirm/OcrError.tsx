import { Button } from "@/components/ui";
import { ScreenState } from "@/types";
import { Receipt } from "lucide-react-native";
import { Image, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

interface OcrErrorProps {
  /** URI of the receipt photo to display */
  photoUri?: string;
  /** Error message to display */
  errorMessage?: string;
  /** Setter for updating the screen state */
  setScreenState: (state: ScreenState) => void;
  /** Ref for the manual amount input */
  inputRef: React.RefObject<TextInput | null>;
  handleRetake: () => void;
  handleSkip: () => void;
}

export const OcrError = (props: OcrErrorProps) => {
  const {
    photoUri,
    errorMessage,
    setScreenState,
    inputRef,
    handleRetake,
    handleSkip,
  } = props;

  return (
    <Animated.View entering={RECEIPT_STATE_ENTER} className="w-full items-center">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
        <Receipt size={30} color="#D14D4D" strokeWidth={2} />
      </View>

      <Text className="text-center text-3xl font-heading tracking-tight text-ink">
        We couldn’t read the total
      </Text>

      <Text className="mt-3 max-w-sm text-center text-[17px] leading-6 text-ink-secondary">
        {errorMessage || "No worries! You can enter the total manually."}
      </Text>

      {/* Receipt preview */}
      {photoUri && (
        <View className="my-6 h-28 w-28 overflow-hidden rounded-2xl border border-separator opacity-60">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}

      <Button
        variant="primary"
        size="lg"
        onPress={() => {
          setScreenState("manual_entry");
          setTimeout(() => inputRef.current?.focus(), 300);
        }}
        className="w-full"
      >
        Enter total manually
      </Button>

      {/* Retake option */}
      <Button
        variant="ghost"
        size="md"
        onPress={handleRetake}
        className="mt-4"
      >
        Retake photo
      </Button>

      {/* Skip option */}
      <Button
        variant="ghost"
        size="md"
        onPress={handleSkip}
        className="mt-2"
      >
        Skip for now
      </Button>
    </Animated.View>
  );
};
