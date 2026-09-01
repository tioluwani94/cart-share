import { formatAmount } from "@/lib/formatAmount";
import { formatMonthName } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { Text, View } from "react-native";

export function TotalDisplay({
  amount,
  sessionCount,
  monthlyBudgetPence,
  remainingPence,
}: {
  amount: number;
  sessionCount: number;
  monthlyBudgetPence?: number;
  remainingPence?: number;
}) {
  const monthName = formatMonthName(Date.now());
  const hasBudget =
    monthlyBudgetPence !== undefined && remainingPence !== undefined;
  const progress = hasBudget
    ? Math.min(Math.max(amount / Math.max(monthlyBudgetPence, 1), 0), 1)
    : 0;

  return (
    <View>
      <Text className="text-sm font-semibold text-ink-secondary">
        Spent in {monthName}
      </Text>
      <Text
        className="mt-1 text-4xl font-heading tracking-tight text-ink"
        accessibilityLabel={`${formatAmount(amount)} spent in ${monthName}`}
      >
        {formatAmount(amount)}
      </Text>

      {hasBudget && (
        <>
          <View
            className="mt-5 h-2 overflow-hidden rounded-full bg-warm-gray-100"
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(progress * 100),
            }}
          >
            <View
              className={cn(
                "h-full rounded-full",
                remainingPence < 0 ? "bg-red-600" : "bg-teal",
              )}
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <View className="mt-3 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text
                className={cn(
                  "text-base font-semibold",
                  remainingPence < 0 ? "text-red-700" : "text-teal",
                )}
              >
                {remainingPence < 0
                  ? `${formatAmount(Math.abs(remainingPence))} over budget`
                  : `${formatAmount(remainingPence)} remaining`}
              </Text>
              <Text className="mt-0.5 text-sm text-ink-secondary">
                of {formatAmount(monthlyBudgetPence)} this month
              </Text>
            </View>
            <Text className="text-sm font-medium text-ink-secondary">
              {sessionCount} {sessionCount === 1 ? "trip" : "trips"}
            </Text>
          </View>
        </>
      )}

      {!hasBudget && (
        <Text className="mt-3 text-sm text-ink-secondary">
          {sessionCount} shopping {sessionCount === 1 ? "trip" : "trips"} recorded
        </Text>
      )}
    </View>
  );
}
