import { Id } from "@/convex/_generated/dataModel";
import { calculatePlanVariance } from "@/lib/budget";
import {
  formatCurrencyFromPence,
  formatFriendlyDate,
} from "@/lib/formatters";
import { themeColors } from "@/lib/theme";
import * as Haptics from "expo-haptics";
import { ChevronRight, Receipt } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

interface SessionHistoryCardProps {
  sessionId: Id<"shoppingSessions">;
  amount?: number;
  storeName?: string;
  sessionDate: number;
  receiptImageUrl?: string | null;
  shopperName?: string;
  shopperImageUrl?: string;
  plannedTotalPence?: number;
  tripBudgetPence?: number;
  paidByName?: string;
  onPress: () => void;
}

export function SessionHistoryCard({
  amount,
  storeName,
  sessionDate,
  receiptImageUrl,
  shopperName,
  paidByName,
  plannedTotalPence,
  tripBudgetPence,
  onPress,
}: SessionHistoryCardProps) {
  const [imageError, setImageError] = useState(false);
  const friendlyDate = formatFriendlyDate(sessionDate);
  const hasReceipt = Boolean(receiptImageUrl && !imageError);
  const variance =
    amount !== undefined && plannedTotalPence && plannedTotalPence > 0
      ? calculatePlanVariance(plannedTotalPence, amount)
      : null;
  const amountLabel =
    amount === undefined ? "Total not recorded" : formatCurrencyFromPence(amount);
  const detail = [
    friendlyDate,
    storeName,
    shopperName ? `by ${shopperName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const planDetail = [
    variance
      ? `${formatCurrencyFromPence(Math.abs(variance.differencePence))} ${
          variance.status === "on_plan"
            ? "on plan"
            : variance.status === "under"
              ? "under plan"
              : "over plan"
        }`
      : null,
    tripBudgetPence !== undefined
      ? `${formatCurrencyFromPence(tripBudgetPence)} trip budget`
      : null,
    paidByName ? `paid from ${paidByName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="min-h-20 flex-row items-center border-b border-separator px-4 py-3 active:bg-warm-gray-50"
      accessibilityRole="button"
      accessibilityLabel={`Shopping trip on ${friendlyDate}, ${amountLabel}${storeName ? ` at ${storeName}` : ""}. Tap to view details.`}
    >
      {hasReceipt ? (
        <View className="h-12 w-12 overflow-hidden rounded-xl bg-warm-gray-100">
          <Image
            source={{ uri: receiptImageUrl ?? undefined }}
            className="h-full w-full"
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        </View>
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-coral-soft">
          <Receipt size={22} color={themeColors.coral} strokeWidth={2} />
        </View>
      )}

      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-ink">{amountLabel}</Text>
        <Text className="mt-0.5 text-sm text-ink-secondary" numberOfLines={2}>
          {detail}
        </Text>
        {planDetail && (
          <Text className="mt-1 text-xs text-ink-secondary" numberOfLines={2}>
            {planDetail}
          </Text>
        )}
      </View>

      <ChevronRight
        size={20}
        color={themeColors.secondaryInk}
        strokeWidth={2}
      />
    </Pressable>
  );
}
