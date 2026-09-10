import { Text, View } from "react-native";
import { ProgressBar } from "@/components/ui";
import { formatCurrencyFromPence } from "@/lib/formatters";

/** The same hierarchy and progress language for active and secondary shops. */
export function ShoppingListSummary({
  title,
  subtitle,
  description,
  completedCount,
  totalCount,
  plannedTotalPence,
  tripBudgetPence,
}: {
  title: string;
  subtitle?: string;
  description: string;
  completedCount: number;
  totalCount: number;
  plannedTotalPence: number;
  tripBudgetPence?: number;
}) {
  return (
    <View>
      <View className="pr-14">
        <Text
          accessibilityRole="header"
          className="text-4xl font-heading tracking-tight text-ink"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-2 text-lg font-semibold text-ink">
            {subtitle}
          </Text>
        ) : null}
        <Text className="mt-0.5 text-sm text-ink-secondary">{description}</Text>
      </View>
      <View className="mt-5 flex-row">
        <ProgressBar
          value={completedCount}
          max={totalCount}
          size="compact"
          accessibilityLabel="Shopping progress"
          accessibilityText={`${completedCount} of ${totalCount} picked up`}
        />
      </View>
      <View className="mt-2 flex-row flex-wrap justify-between gap-2">
        <Text className="text-sm font-medium text-ink-secondary">
          {completedCount} of {totalCount} picked up
        </Text>
        <Text className="text-sm font-semibold text-ink-secondary">
          {plannedTotalPence > 0
            ? `${formatCurrencyFromPence(plannedTotalPence)} planned`
            : tripBudgetPence !== undefined
              ? `${formatCurrencyFromPence(tripBudgetPence)} budget`
              : "Prices optional"}
        </Text>
      </View>
    </View>
  );
}
