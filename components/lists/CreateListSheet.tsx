import {
  AmountInput,
  Button,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
  Input,
  useToast,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ListPlus } from "lucide-react-native";
import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { CATEGORIES, CategoryChip } from "./CategoryChip";
import { parseCurrencyInputToPence } from "@/lib/formatters";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { themeColors } from "@/lib/theme";
import { useIsOnline } from "@/lib/useNetworkStatus";

/**
 * Bottom sheet for creating a new shopping list.
 */
export const CreateListSheet = forwardRef<
  GlassBottomSheetRef,
  { setAsNextShop?: boolean }
>(function CreateListSheet({ setAsNextShop = false }, ref) {
  const router = useRouter();
  const { showToast } = useToast();
  const creatingRef = useRef(false);
  const analytics = useAnalytics();
  const isOnline = useIsOnline();
  const [listName, setListName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [tripBudget, setTripBudget] = useState("");
  const [tripBudgetError, setTripBudgetError] = useState("");

  // Get current household
  const household = useQuery(api.households.getCurrentHousehold);
  const createList = useMutation(api.lists.create);
  const recalculate = useMutation(api.notifications.recalculateForHousehold);

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ["72%"], []);

  // Reset form state when sheet closes
  const resetForm = useCallback(() => {
    setListName("");
    setSelectedCategory(null);
    setError("");
    setIsCreating(false);
    setTripBudget("");
    setTripBudgetError("");
  }, []);

  const dismissSheet = useCallback(() => {
    if (ref && typeof ref !== "function") {
      ref.current?.dismiss();
    }
  }, [ref]);

  const handleCreate = async () => {
    Keyboard.dismiss();
    if (creatingRef.current) return;

    if (!isOnline) {
      setError("Reconnect to create this list.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Validate
    if (!listName.trim()) {
      setError("Give your list a name!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!household?._id) {
      setError("Couldn't find your household. Please try again.");
      return;
    }

    const tripBudgetPence = tripBudget.trim()
      ? parseCurrencyInputToPence(tripBudget)
      : undefined;
    if (tripBudget.trim() && tripBudgetPence === null) {
      setTripBudgetError("Enter a valid amount");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError("");
    setTripBudgetError("");
    creatingRef.current = true;
    setIsCreating(true);

    try {
      const result = await createList({
        householdId: household._id,
        name: listName.trim(),
        category: selectedCategory ?? undefined,
        tripBudgetPence: tripBudgetPence ?? undefined,
        setAsNextShop: setAsNextShop || undefined,
        onlyIfNoActiveList: setAsNextShop || undefined,
      });
      analytics.track("shopping list created", {
        household_id: household._id,
        source: "plan",
      });

      if (setAsNextShop) {
        try {
          await recalculate({});
        } catch (recalculationError) {
          console.error(
            "Couldn't refresh reminder timing:",
            recalculationError,
          );
        }
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dismissSheet();
      showToast({ message: "List created", tone: "success" });
      if (setAsNextShop) {
        router.navigate("/(tabs)/shop");
      } else {
        router.push(`/list/${result.listId}`);
      }
    } catch (err) {
      console.error("Failed to create list:", err);
      setError("Something went wrong. Please try again!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  return (
    <GlassBottomSheet
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={resetForm}
      dismissible={!isCreating}
    >
      <GlassBottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        <>
          <GlassSheetHeader
            title={setAsNextShop ? "New Next shop" : "New shopping list"}
            description="Name the shop, then add optional details."
            icon={
              <ListPlus size={21} color={themeColors.coral} strokeWidth={2} />
            }
            onClose={dismissSheet}
            closeDisabled={isCreating}
            closeAccessibilityLabel="Close new shopping list"
          />

          <Input
            label="List name"
            value={listName}
            onChangeText={(text) => {
              setListName(text);
              if (error) setError("");
            }}
            error={error}
            placeholder="e.g. Weekly groceries"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <AmountInput
            label="Trip budget (optional)"
            value={tripBudget}
            onChangeText={(value) => {
              setTripBudget(value);
              setTripBudgetError("");
            }}
            error={tripBudgetError}
            placeholder="0.00"
            returnKeyType="done"
          />

          <View className="mt-1">
            <Text className="mb-3 text-[15px] font-semibold leading-5 text-ink">
              Category (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <CategoryChip
                  key={category.id}
                  {...category}
                  selected={selectedCategory === category.id}
                  onPress={() =>
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id,
                    )
                  }
                />
              ))}
            </View>
          </View>

          <View className="mt-7">
            <Button
              onPress={handleCreate}
              variant="primary"
              size="md"
              loading={isCreating}
              disabled={isCreating || !listName.trim() || !isOnline}
              accessibilityLabel={
                !isOnline
                  ? setAsNextShop
                    ? "Reconnect to create Next shop"
                    : "Reconnect to create shopping list"
                  : setAsNextShop
                    ? "Create Next shop"
                    : "Create shopping list"
              }
              accessibilityHint={
                setAsNextShop
                  ? "Creates this list as the household's Next shop and opens it"
                  : "Creates the list and opens it"
              }
              className="w-full"
            >
              {setAsNextShop ? "Create Next shop" : "Create list"}
            </Button>
            {!isOnline && (
              <Text className="mt-2 text-center text-sm text-ink-secondary">
                Reconnect to create this list
              </Text>
            )}
          </View>
        </>
      </GlassBottomSheetScrollView>
    </GlassBottomSheet>
  );
});
