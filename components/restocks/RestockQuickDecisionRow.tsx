import { themeColors } from "@/lib/theme";
import { Check, Plus } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export type RestockQuickDecision =
  | "add"
  | "still_have_some"
  | "not_this_time";

export function RestockQuickDecisionRow({
  cadenceLabel,
  displayName,
  isAdded,
  isBusy,
  canAdd = true,
  onDecision,
  showDivider = false,
}: {
  cadenceLabel: string;
  displayName: string;
  isAdded: boolean;
  isBusy: boolean;
  canAdd?: boolean;
  onDecision: (decision: RestockQuickDecision) => void;
  showDivider?: boolean;
}) {
  return (
    <View className={showDivider ? "border-t border-separator py-4" : "py-4"}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-ink">{displayName}</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-secondary">
            {cadenceLabel}
          </Text>
        </View>
        {isBusy && <ActivityIndicator color={themeColors.coral} />}
      </View>

      <View className="mt-3 gap-2">
        <Pressable
          onPress={() => onDecision("add")}
          disabled={isBusy || isAdded || !canAdd}
          className="min-h-12 flex-row items-center justify-center rounded-full bg-coral px-4 py-2 disabled:opacity-60"
          accessibilityLabel={
            isAdded
              ? `${displayName} already added to shop`
              : !canAdd
                ? `Choose a Next shop before adding ${displayName}`
              : `Add ${displayName} to shop`
          }
          accessibilityRole="button"
        >
          {isAdded ? (
            <Check size={15} color={themeColors.surface} />
          ) : (
            <Plus size={15} color={themeColors.surface} />
          )}
          <Text className="ml-1.5 text-sm font-semibold text-white">
            {isAdded ? "Added" : canAdd ? "Add" : "Choose Next shop first"}
          </Text>
        </Pressable>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onDecision("still_have_some")}
            disabled={isBusy}
            className="min-h-12 flex-1 items-center justify-center rounded-full bg-warm-gray-100 px-3 py-2 disabled:opacity-60"
            accessibilityLabel={`Still have some ${displayName}`}
            accessibilityRole="button"
          >
            <Text className="text-center text-sm font-semibold text-ink-secondary">
              Still have some
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onDecision("not_this_time")}
            disabled={isBusy}
            className="min-h-12 flex-1 items-center justify-center rounded-full bg-warm-gray-100 px-3 py-2 disabled:opacity-60"
            accessibilityLabel={`Not now for ${displayName}`}
            accessibilityRole="button"
          >
            <Text className="text-center text-sm font-semibold text-ink-secondary">
              Not now
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
