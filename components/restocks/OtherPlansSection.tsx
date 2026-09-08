import {
  CalendarDays,
  ChevronRight,
  Plus,
  ShoppingBag,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";
import { themeColors } from "@/lib/theme";

interface Props {
  lists: {
    _id: Id<"lists">;
    name: string;
    totalItems: number;
    category?: string;
  }[];
  isOnline: boolean;
  onOpen: (id: Id<"lists">) => void;
  onCreate: () => void;
}

/** Compact secondary plans from the approved prototype; never sample data. */
export function OtherPlansSection({
  lists,
  isOnline,
  onOpen,
  onCreate,
}: Props) {
  return (
    <View className={lists.length > 0 ? "mt-[27px]" : ""}>
      {lists.length > 0 && (
        <>
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <Text className="font-heading text-[21px] leading-7 text-ink">
              Other lists
            </Text>
            <Text className="text-xs text-ink-secondary">
              {lists.length} {lists.length === 1 ? "list" : "lists"}
            </Text>
          </View>
          <View className="gap-3">
            {lists.map((list) => {
              const Icon = list.category ? ShoppingBag : CalendarDays;
              return (
                <Pressable
                  key={list._id}
                  onPress={() => onOpen(list._id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${list.name}, ${list.totalItems} ${list.totalItems === 1 ? "item" : "items"}, separate from next shop`}
                  className="min-h-[78px] flex-row items-center gap-3 rounded-[19px] border border-separator bg-white p-[13px] active:opacity-60"
                >
                  <View className="h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-[#F6F1E6]">
                    <Icon size={22} color="#936934" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-heading text-base leading-[22px] text-ink">
                      {list.name}
                    </Text>
                    <Text className="mt-[3px] text-xs leading-[18px] text-ink-secondary">
                      {list.totalItems}{" "}
                      {list.totalItems === 1 ? "item" : "items"} · separate from
                      next shop
                    </Text>
                  </View>
                  <ChevronRight size={20} color={themeColors.secondaryInk} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      <Button
        variant="ghost"
        forceSolid
        disabled={!isOnline}
        onPress={onCreate}
        accessibilityLabel={
          isOnline ? "Create another list" : "Reconnect to create another list"
        }
        className="mt-3 min-h-[49px] gap-[9px] border-0 bg-[#F4F3EF] py-[11px]"
      >
        <Plus size={20} color={themeColors.ink} />
        <Text
          style={{ fontFamily: "Nunito_800ExtraBold" }}
          className="text-base text-ink"
        >
          {isOnline ? "New list" : "Reconnect to create"}
        </Text>
      </Button>
    </View>
  );
}
