import { PiggyBank } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { themeColors } from "@/lib/theme";

export function MonthlyBudgetPrompt({
  monthlyBudgetPence,
  onSetup,
}: {
  monthlyBudgetPence?: number;
  onSetup: () => void;
}) {
  if (monthlyBudgetPence !== undefined) return null;
  return (
    <View className="mx-6 mb-6 rounded-2xl border border-separator bg-white p-5">
      <View className="flex-row items-center">
        <View
          accessible={false}
          className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-teal-soft"
        >
          <PiggyBank size={24} color={themeColors.teal} />
        </View>
        <Text className="flex-1 font-heading text-lg leading-6 text-ink">
          Give your groceries a budget
        </Text>
      </View>
      <Text className="mb-4 mt-3 text-base leading-6 text-ink-secondary">
        Set a monthly guide for your household and see what’s left as you shop.
      </Text>
      <Button
        forceSolid
        onPress={onSetup}
        accessibilityLabel="Set monthly grocery budget"
      >
        Set monthly budget
      </Button>
    </View>
  );
}
