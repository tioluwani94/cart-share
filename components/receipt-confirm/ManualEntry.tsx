import { AmountInput, Button } from "@/components/ui";
import { parseCurrencyInputToPence } from "@/lib/formatters";
import { themeColors } from "@/lib/theme";
import { PoundSterling } from "lucide-react-native";
import { Text, type TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

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
    <Animated.View entering={RECEIPT_STATE_ENTER} className="w-full items-center">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
        <PoundSterling
          size={29}
          color={themeColors.coral}
          strokeWidth={2}
        />
      </View>

      <Text className="text-center text-3xl font-heading tracking-tight text-ink">
        Enter what you spent
      </Text>

      <Text className="mb-8 mt-3 max-w-sm text-center text-[17px] leading-6 text-ink-secondary">
        Add the shop total now. Store and payment details come next.
      </Text>

      <AmountInput
        ref={inputRef}
        label="Shop total"
        value={manualAmount}
        onChangeText={setManualAmount}
        error={errorMessage}
        presentation="prominent"
        placeholder="0.00"
        returnKeyType="done"
        onSubmitEditing={handleManualSubmit}
        accessibilityLabel="Enter total amount"
        accessibilityHint="Enter the amount in pounds and pence"
        containerClassName="mb-0 w-full"
      />

      <Button
        variant="primary"
        size="lg"
        onPress={handleManualSubmit}
        className="mt-6 w-full"
        disabled={(parseCurrencyInputToPence(manualAmount) ?? 0) <= 0}
        accessibilityLabel="Continue with this total"
      >
        Continue
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={handleSkip}
        className="mt-4"
        accessibilityLabel="Finish without adding a total"
      >
        Skip for now
      </Button>
    </Animated.View>
  );
};
