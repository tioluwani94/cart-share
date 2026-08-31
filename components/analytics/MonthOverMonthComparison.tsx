import { formatCurrencyFromPence } from "@/lib/formatters";
import { themeColors } from "@/lib/theme";
import { Minus, TrendingDown, TrendingUp } from "lucide-react-native";
import { Text, View } from "react-native";

interface MonthlyData {
  month: number;
  year: number;
  label: string;
  totalPence: number;
  totalPounds: number;
  sessionCount: number;
}

interface MonthOverMonthComparisonProps {
  spendingHistory: MonthlyData[];
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function MonthOverMonthComparison({
  spendingHistory,
}: MonthOverMonthComparisonProps) {
  const currentMonth = spendingHistory[spendingHistory.length - 1];
  const previousMonth = spendingHistory[spendingHistory.length - 2];

  if (!previousMonth) return null;

  const difference = currentMonth.totalPence - previousMonth.totalPence;
  const percentageChange = calculatePercentageChange(
    currentMonth.totalPence,
    previousMonth.totalPence,
  );
  const isDown = difference < 0;
  const isUp = difference > 0;
  const Icon = isDown ? TrendingDown : isUp ? TrendingUp : Minus;
  const iconColor = isDown ? themeColors.teal : isUp ? themeColors.coral : themeColors.secondaryInk;
  const amount = formatCurrencyFromPence(Math.abs(difference));

  return (
    <View className="flex-row items-center border-t border-separator py-4">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-warm-gray-100">
        <Icon size={21} color={iconColor} strokeWidth={2.25} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm text-ink-secondary">Compared with last month</Text>
        <Text className="mt-0.5 text-base font-semibold text-ink">
          {difference === 0
            ? "About the same"
            : `${amount} ${isDown ? "less" : "more"}`}
        </Text>
      </View>
      {difference !== 0 && (
        <Text className="text-sm font-semibold text-ink-secondary">
          {isDown ? "−" : "+"}
          {Math.abs(percentageChange)}%
        </Text>
      )}
    </View>
  );
}
