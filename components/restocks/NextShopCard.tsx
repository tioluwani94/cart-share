import { CalendarDays, Pencil } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { themeColors } from "@/lib/theme";
import { formatCurrencyFromPence } from "@/lib/formatters";
import type { ShoppingMode } from "@/lib/shoppingList";

interface Props {
  name: string;
  plannedFor?: number;
  totalItems: number;
  plannedTotalPence: number;
  tripBudgetPence?: number;
  shoppingMode: ShoppingMode;
  locale: string;
  timeZone: string;
  onEdit: () => void;
  onOpen: () => void;
}

export function NextShopCard({
  name,
  plannedFor,
  totalItems,
  plannedTotalPence,
  tripBudgetPence,
  shoppingMode,
  locale,
  timeZone,
  onEdit,
  onOpen,
}: Props) {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(
      plannedFor!,
    );
  const amount =
    plannedTotalPence > 0
      ? `${formatCurrencyFromPence(plannedTotalPence)} planned`
      : tripBudgetPence !== undefined
        ? `${formatCurrencyFromPence(tripBudgetPence)} budget`
        : null;
  return (
    <View
      testID="next-shop-compact-card"
      className="flex-row items-center rounded-[18px] border border-separator bg-white p-[14px]"
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`View ${name} in Shop`}
        accessibilityHint={`${totalItems} ${totalItems === 1 ? "item" : "items"}. Opens the Shop tab.`}
        className="absolute inset-0 rounded-[18px] active:bg-warm-gray-100"
      />
      <View
        accessible={false}
        pointerEvents="none"
        className="min-h-[50px] w-[46px] items-center justify-center rounded-[11px] bg-coral-soft px-1 py-1.5"
      >
        {plannedFor ? (
          <>
            <Text className="text-[10px] font-semibold uppercase text-coral">
              {format({ weekday: "short" })}
            </Text>
            <Text className="font-heading text-[22px] leading-7 text-coral">
              {format({ day: "numeric" })}
            </Text>
          </>
        ) : (
          <CalendarDays size={24} color={themeColors.coral} />
        )}
      </View>
      <View
        pointerEvents="none"
        className="ml-3 min-h-12 flex-1 justify-center"
      >
        <Text
          className="font-heading text-[17px] leading-[23px] text-ink"
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text className="mt-0.5 text-xs leading-[18px] text-ink-secondary">
          {totalItems} {totalItems === 1 ? "item" : "items"}
          {" · "}
          {shoppingMode === "online" ? "Online" : "In store"}
        </Text>
        <Text className="text-xs leading-[18px] text-ink-secondary">
          {plannedFor
            ? format({
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Choose a date and time"}
          {amount ? ` · ${amount}` : ""}
        </Text>
      </View>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit shopping date, time and mode"
        className="ml-3 h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8D2D0] bg-coral-soft active:opacity-60"
      >
        <Pencil size={20} color={themeColors.coral} />
      </Pressable>
    </View>
  );
}
