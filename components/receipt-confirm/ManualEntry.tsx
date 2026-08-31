import { Button } from "@/components/ui";
import { themeColors } from "@/lib/theme";
import { CheckCircle2, PoundSterling } from "lucide-react-native";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

interface ManualEntryProps {
  inputRef: React.RefObject<TextInput | null>;
  /** Current manual amount input value */
  manualAmount: string;
  /** Handler for submitting the manual amount */
  handleManualSubmit: () => void;
  /** Setter for updating the manual amount input value */
  setManualAmount: (value: string) => void;
  handleSkip: () => void;
  errorMessage?: string;
}

export const ManualEntry = (props: ManualEntryProps) => {
  const {
    inputRef,
    handleManualSubmit,
    handleSkip,
    manualAmount,
    setManualAmount,
    errorMessage,
  } = props;

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      className="items-center w-full"
    >
      {/* Icon */}
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-teal/20">
        <PoundSterling size={32} color="#4ECDC4" strokeWidth={2} />
      </View>

      <Text className="text-center text-xl font-bold text-warm-gray-900">
        Enter the total
      </Text>

      <Text className="mt-2 mb-6 text-center text-sm text-warm-gray-500">
        Type what you spent. You can add the store and payment source next.
      </Text>

      {/* Manual input */}
      <View className="w-full px-4">
        <View className="relative">
          <Text className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-warm-gray-400 z-10">
            £
          </Text>
          <TextInput
            ref={inputRef}
            value={manualAmount}
            onChangeText={setManualAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={themeColors.muted}
            className="h-16 w-full rounded-2xl border-2 border-warm-gray-200 bg-white pl-12 pr-4 text-3xl font-bold text-warm-gray-900 text-center"
            maxLength={10}
            accessibilityLabel="Enter total amount"
          />
        </View>
      </View>

      {errorMessage ? (
        <Text className="mt-3 px-4 text-center text-sm text-red-600">
          {errorMessage}
        </Text>
      ) : null}

      {/* Submit button */}
      <Button
        variant="primary"
        size="lg"
        onPress={handleManualSubmit}
        className="mt-6 w-full"
        disabled={!manualAmount || parseFloat(manualAmount) <= 0}
      >
        <View className="flex-row items-center">
          <CheckCircle2 size={20} color="white" strokeWidth={2} />
          <Text className="ml-2 text-base font-semibold text-white">
            Confirm Amount
          </Text>
        </View>
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
