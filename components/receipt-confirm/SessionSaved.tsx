import { formatAmount } from "@/lib/formatAmount";
import { themeColors } from "@/lib/theme";
import { Check } from "lucide-react-native";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { RECEIPT_STATE_ENTER } from "./receiptStateMotion";

interface SessionSavedProps {
  /** Extracted total amount in pence */
  extractedTotal: number | null;
  /** Number of shopping sessions this month */
  monthlySessionCount: number;
}

export const SessionSaved = ({
  extractedTotal,
  monthlySessionCount,
}: SessionSavedProps) => {
  return (
    <Animated.View entering={RECEIPT_STATE_ENTER} className="w-full items-center">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-3xl bg-teal-soft">
        <Check size={40} color={themeColors.teal} strokeWidth={2.5} />
      </View>

      <Text className="text-center text-3xl font-heading tracking-tight text-ink">
        Trip saved
      </Text>

      {/* Amount saved */}
      {extractedTotal !== null && (
        <Text className="mt-2 text-center text-xl font-semibold text-ink-secondary">
          {formatAmount(extractedTotal)}
        </Text>
      )}

      <View className="mt-8 w-full rounded-2xl bg-teal-soft px-5 py-4">
        <Text className="text-center text-[16px] leading-6 text-ink-secondary">
          This is trip {monthlySessionCount} for your household this month.
        </Text>
      </View>

      <Text className="mt-6 text-center text-sm text-ink-tertiary">
        Opening Spending…
      </Text>
    </Animated.View>
  );
};
