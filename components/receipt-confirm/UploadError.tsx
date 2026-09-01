import { Button } from "@/components/ui";
import { Receipt } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

interface UploadErrorProps {
  /** Error message to display */
  errorMessage?: string;
  /** Handler for retrying the upload */
  handleTryAgain: () => void;
  handleSkip: () => void;
}

export const UploadError = ({
  errorMessage,
  handleTryAgain,
  handleSkip,
}: UploadErrorProps) => {
  return (
    <Animated.View entering={RECEIPT_STATE_ENTER} className="w-full items-center">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
        <Receipt size={30} color="#D14D4D" strokeWidth={2} />
      </View>

      <Text className="text-center text-3xl font-heading tracking-tight text-ink">
        Receipt upload failed
      </Text>

      <Text className="mt-3 max-w-sm text-center text-[17px] leading-6 text-ink-secondary">
        {errorMessage || "We couldn’t upload your receipt. Try again when you’re ready."}
      </Text>

      {/* Retry button */}
      <Button
        variant="primary"
        size="lg"
        onPress={handleTryAgain}
        className="mt-8 w-full"
      >
        Try again
      </Button>

      {/* Skip option */}
      <Button
        variant="ghost"
        size="md"
        onPress={handleSkip}
        className="mt-4"
      >
        Skip for now
      </Button>
    </Animated.View>
  );
};
