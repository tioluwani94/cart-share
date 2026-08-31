import { Button } from "@/components/ui";
import { formatAmount } from "@/lib/formatAmount";
import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";
import { CheckCircle2, Edit3 } from "lucide-react-native";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";
import type { Id } from "@/convex/_generated/dataModel";

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

  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.springify().damping(90)}
      className="items-center"
    >
      {/* Success icon */}
      <Animated.View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-teal/20">
        <CheckCircle2 size={48} color="#4ECDC4" strokeWidth={2} />
      </Animated.View>

      <Text className="text-center text-xl font-bold text-warm-gray-900">
        Found it! 🎉
      </Text>

      {/* Large extracted total */}
      {extractedTotal !== null && (
        <Animated.View className="my-6">
          <Text className="text-center text-5xl font-bold text-coral">
            {formatAmount(extractedTotal)}
          </Text>
        </Animated.View>
      )}

      {/* Receipt thumbnail */}
      {photoUri && (
        <View className="mb-6 h-28 w-28 overflow-hidden rounded-xl shadow-md">
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
      )}

      <View className="mb-5 w-full">
        <Text className="mb-2 text-sm font-medium text-warm-gray-600">
          Store (optional)
        </Text>
        <TextInput
          value={storeName}
          onChangeText={onStoreNameChange}
          placeholder="e.g. Tesco"
          placeholderTextColor={themeColors.muted}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={80}
          className="min-h-12 rounded-2xl border border-warm-gray-200 bg-white px-4 text-base text-warm-gray-900"
          accessibilityLabel="Store name, optional"
        />
      </View>

      <View className="mb-5 w-full">
        <Text className="mb-2 text-center text-sm font-medium text-warm-gray-600">
          Paid from
        </Text>
        <View className="flex-row flex-wrap justify-center gap-2">
          {paymentOptions.map((option) => {
            const selected = paidBy === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onPaidByChange(option.value)}
                className={cn(
                  "min-h-[44px] justify-center rounded-full px-4",
                  selected ? "bg-teal" : "bg-warm-gray-100",
                )}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Paid from ${option.label}`}
              >
                <Text
                  className={cn(
                    "text-sm font-medium",
                    selected ? "text-white" : "text-warm-gray-700",
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
        <Text className="mb-4 w-full text-center text-sm text-red-600">
          {errorMessage}
        </Text>
      ) : null}

      {/* Confirm button */}
      <Button
        size="lg"
        variant="primary"
        className="w-full"
        onPress={handleConfirm}
      >
        <View className="flex-row items-center">
          <CheckCircle2 size={20} color="white" strokeWidth={2} />
          <Text className="ml-2 text-base font-semibold text-white flex-1">
            That's right!
          </Text>
        </View>
      </Button>

      {/* Edit option */}
      <Pressable
        onPress={handleNotQuite}
        className="mt-4 flex-row items-center py-2"
        accessibilityLabel="Edit amount manually"
      >
        <Edit3 size={16} color="#6B6B6B" strokeWidth={2} />
        <Text className="ml-2 text-base text-warm-gray-600 underline">
          Not quite — let me fix it
        </Text>
      </Pressable>
    </Animated.View>
  );
};
