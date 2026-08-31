import {
  Button,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  type GlassBottomSheetRef,
  Input,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ListPlus, X } from "lucide-react-native";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import { SuccessCelebration } from "./SuccessCelebration";
import { CATEGORIES, CategoryChip } from "./CategoryChip";
import { parseCurrencyInputToPence } from "@/lib/formatters";
import { themeColors } from "@/lib/theme";

/**
 * Bottom sheet for creating a new shopping list.
 */
export const CreateListSheet = forwardRef<
  GlassBottomSheetRef,
  Record<never, never>
>(
  function CreateListSheet(_props, ref) {
    const router = useRouter();
    const [listName, setListName] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
      null,
    );
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [tripBudget, setTripBudget] = useState("");
    const [tripBudgetError, setTripBudgetError] = useState("");

    // Get current household
    const household = useQuery(api.households.getCurrentHousehold);
    const createList = useMutation(api.lists.create);

    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ["72%"], []);

    // Reset form state when sheet closes
    const resetForm = useCallback(() => {
      setListName("");
      setSelectedCategory(null);
      setError("");
      setIsCreating(false);
      setShowSuccess(false);
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
      setIsCreating(true);

      try {
        const result = await createList({
          householdId: household._id,
          name: listName.trim(),
          category: selectedCategory ?? undefined,
          tripBudgetPence: tripBudgetPence ?? undefined,
        });

        // Success!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowSuccess(true);

        // Navigate to the new list after celebration
        setTimeout(() => {
          resetForm();
          dismissSheet();
          router.push(`/list/${result.listId}`);
        }, 1800);
      } catch (err) {
        console.error("Failed to create list:", err);
        setError("Something went wrong. Please try again!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showSuccess ? (
            <SuccessCelebration listName={listName.trim()} />
          ) : (
            <>
              <View className="mb-7 flex-row items-start">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-coral-soft">
                  <ListPlus size={23} color={themeColors.coral} strokeWidth={2} />
                </View>
                <View className="ml-3 flex-1 pr-3">
                  <Text className="text-2xl font-bold tracking-tight text-ink">
                    New shopping list
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-ink-secondary">
                    Name the shop, then add a budget or category if useful.
                  </Text>
                </View>
                <Pressable
                  onPress={dismissSheet}
                  disabled={isCreating}
                  className="h-12 w-12 items-center justify-center rounded-full bg-warm-gray-100 active:opacity-70 disabled:opacity-40"
                  accessibilityLabel="Close new shopping list"
                  accessibilityRole="button"
                >
                  <X size={20} color={themeColors.secondaryInk} />
                </Pressable>
              </View>

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

              <Input
                label="Trip budget (optional)"
                value={tripBudget}
                onChangeText={(value) => {
                  setTripBudget(value);
                  setTripBudgetError("");
                }}
                error={tripBudgetError}
                placeholder="£0.00"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              <View className="mt-1">
                <Text className="mb-3 text-sm font-semibold text-ink">
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

              <View className="mt-6">
                <Button
                  onPress={handleCreate}
                  variant="primary"
                  size="md"
                  loading={isCreating}
                  disabled={!listName.trim()}
                  accessibilityLabel="Create shopping list"
                  accessibilityHint="Creates the list and opens it"
                  className="w-full"
                >
                  Create list
                </Button>
              </View>
            </>
          )}
        </GlassBottomSheetScrollView>
      </GlassBottomSheet>
    );
  },
);
