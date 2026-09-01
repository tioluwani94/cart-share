import { Button } from "@/components/ui";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";
import { FlashList } from "@shopify/flash-list";
import { ChevronRight, ShoppingBasket } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export interface NextShopListOption {
  _id: Id<"lists">;
  name: string;
  totalItems: number;
}

export function getNextShopChoiceHeight(fontScale: number): number {
  return Math.round(72 + Math.max(0, fontScale - 1) * 88);
}

export function NextShopChooser({
  choosingListId,
  error,
  existingLists,
  isOnline,
  onChoose,
  onCreate,
}: {
  choosingListId?: Id<"lists"> | null;
  error?: string | null;
  existingLists: readonly NextShopListOption[];
  isOnline: boolean;
  onChoose: (listId: Id<"lists">) => void;
  onCreate: () => void;
}) {
  const isChoosing = choosingListId !== undefined && choosingListId !== null;
  const { fontScale } = useWindowDimensions();
  const choiceHeight = getNextShopChoiceHeight(fontScale);

  return (
    <View className="rounded-2xl border border-separator bg-surface p-5">
      <View className="h-12 w-12 items-center justify-center rounded-xl bg-coral-soft">
        <ShoppingBasket size={23} color={themeColors.coral} />
      </View>
      <Text className="mt-4 text-2xl font-heading text-ink">
        Choose your next shop
      </Text>
      <Text className="mt-2 text-base leading-6 text-ink-secondary">
        Use a list you've already started or create a fresh one.
      </Text>
      {!isOnline && (
        <Text className="mt-2 text-sm font-medium text-ink-secondary">
          Reconnect to choose or create a Next shop
        </Text>
      )}

      {existingLists.length > 0 && (
        <View className="mt-5">
          <Text className="text-sm font-semibold text-ink-secondary">
            Existing lists
          </Text>
          <View className="mt-2" style={{ height: choiceHeight }}>
            <FlashList
              horizontal
              data={existingLists}
              extraData={`${choosingListId ?? ""}:${isOnline}`}
              keyExtractor={(list) => list._id}
              showsHorizontalScrollIndicator={false}
              ItemSeparatorComponent={() => <View className="w-2" />}
              renderItem={({ item: list }) => {
                const isThisListChoosing = choosingListId === list._id;
                const disabled = !isOnline || isChoosing;
                return (
                  <Pressable
                    onPress={() => onChoose(list._id)}
                    disabled={disabled}
                    className={cn(
                      "w-64 flex-row items-center rounded-xl border border-separator bg-background-light px-4 py-3",
                      disabled && "opacity-60",
                    )}
                    style={{ height: choiceHeight }}
                    accessibilityLabel={
                      isOnline
                        ? `Use ${list.name} as Next shop`
                        : `Reconnect to use ${list.name} as Next shop`
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled,
                      busy: isThisListChoosing,
                    }}
                  >
                    <View className="flex-1 pr-3">
                      <Text
                        className="font-semibold text-ink"
                        numberOfLines={2}
                      >
                        {list.name}
                      </Text>
                      <Text className="mt-0.5 text-sm text-ink-secondary">
                        {list.totalItems}{" "}
                        {list.totalItems === 1 ? "item" : "items"}
                      </Text>
                    </View>
                    {isThisListChoosing ? (
                      <ActivityIndicator color={themeColors.coral} />
                    ) : (
                      <ChevronRight
                        size={20}
                        color={themeColors.secondaryInk}
                      />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      )}

      {error && <Text className="mt-3 text-sm text-red-600">{error}</Text>}

      <Button
        onPress={onCreate}
        disabled={!isOnline || isChoosing}
        className="mt-5 w-full"
        accessibilityLabel={
          isOnline
            ? "Create a new Next shop"
            : "Reconnect to create a new Next shop"
        }
      >
        {isOnline ? "Create Next shop" : "Reconnect to create"}
      </Button>
    </View>
  );
}
