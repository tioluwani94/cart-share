import { themeColors } from "@/lib/theme";
import { ReceiptText } from "lucide-react-native";
import { Text, View } from "react-native";

export const AnalyticsEmptyState = () => {
  return (
    <View className="mx-6 mt-8 items-center rounded-2xl border border-separator bg-surface px-6 py-10">
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-coral-soft">
        <ReceiptText size={30} color={themeColors.coral} strokeWidth={2} />
      </View>
      <Text className="mt-5 text-center text-xl font-bold text-ink">
        Your spending starts here
      </Text>
      <Text className="mt-2 max-w-sm text-center text-base leading-6 text-ink-secondary">
        Finish a shop and save its receipt total. This page will show what you
        spent, what remains, and your recent trips.
      </Text>
    </View>
  );
};
