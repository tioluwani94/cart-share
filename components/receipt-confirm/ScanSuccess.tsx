import { Button, Input } from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
import { formatAmount } from "@/lib/formatAmount";
import { themeColors } from "@/lib/theme";
import { CheckCircle2 } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

interface ScanSuccessProps {
  /** URI of the receipt photo to display */
  photoUri?: string;
  /** Extracted total amount in pence */
  extractedTotal: number | null;
  /** Handler for confirming the extracted total */
  handleConfirm: () => void;
  /** Handler for editing the extracted total */
  handleNotQuite: () => void;
  paidBy: "joint" | Id<"users">;
  onPaidByChange: (value: "joint" | Id<"users">) => void;
  paymentOptions: {
    value: "joint" | Id<"users">;
    label: string;
  }[];
  storeName: string;
  onStoreNameChange: (value: string) => void;
  errorMessage?: string;
}

export const ScanSuccess = (props: ScanSuccessProps) => {
  const {
    photoUri,
    extractedTotal,
    handleConfirm,
    handleNotQuite,
    onPaidByChange,
    paidBy,
    paymentOptions,
    storeName,
    onStoreNameChange,
    errorMessage,
  } = props;

  return (
    <Animated.View entering={RECEIPT_STATE_ENTER} className="w-full items-center">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-2xl bg-teal-soft">
        <CheckCircle2 size={31} color={themeColors.teal} strokeWidth={2.25} />
      </View>

      <Text className="text-center text-3xl font-heading tracking-tight text-ink">
        Receipt total found
      </Text>

      {/* Large extracted total */}
      {extractedTotal !== null && (
        <View className="my-6">
          <Text className="text-center text-5xl font-heading text-coral">
            {formatAmount(extractedTotal)}
          </Text>
        </View>
      )}

      {/* Receipt thumbnail */}
      {photoUri && (
        <View className="mb-6 h-28 w-28 overflow-hidden rounded-2xl border border-separator bg-surface">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}

      <Input
          label="Store (optional)"
          value={storeName}
          onChangeText={onStoreNameChange}
          placeholder="e.g. Tesco"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={80}
          containerClassName="w-full"
          accessibilityLabel="Store name, optional"
      />

      <View className="mb-5 w-full">
        <Text className="mb-2 text-[15px] font-semibold leading-5 text-ink">
          Paid from
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {paymentOptions.map((option) => {
            const selected = paidBy === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onPaidByChange(option.value)}
                className={cn(
                  "min-h-12 justify-center rounded-full border px-4 active:opacity-70",
                  selected
                    ? "border-teal bg-teal-soft"
                    : "border-separator bg-surface",
                )}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Paid from ${option.label}`}
              >
                <Text
                  className={cn(
                    "text-[15px] font-semibold",
                    selected ? "text-teal" : "text-ink-secondary",
                  )}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {errorMessage ? (
        <Text
          className="mb-4 w-full text-sm leading-5 text-red-700"
          accessibilityRole="alert"
        >
          {errorMessage}
        </Text>
      ) : null}

      <Button
        size="lg"
        variant="primary"
        className="w-full"
        onPress={handleConfirm}
        accessibilityLabel="Save trip with this receipt total"
      >
        Save trip
      </Button>

      <Button
        variant="ghost"
        size="md"
        onPress={handleNotQuite}
        className="mt-4"
        accessibilityLabel="Edit amount manually"
      >
        Edit total
      </Button>
    </Animated.View>
  );
};
