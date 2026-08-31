import { Button, Input } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { SuccessCelebration } from "./SuccessCelebration";
import { CATEGORIES, CategoryChip } from "./CategoryChip";
import { parseCurrencyInputToPence } from "@/lib/formatters";

interface CreateListSheetProps {
  onClose: () => void;
}

/**
 * Bottom sheet for creating a new shopping list.
 */
export const CreateListSheet = forwardRef<BottomSheet, CreateListSheetProps>(
  function CreateListSheet({ onClose }, ref) {
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
    const snapPoints = useMemo(() => ["85%"], []);

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

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index === -1) {
          resetForm();
          onClose();
        }
      },
      [onClose, resetForm],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

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
          onClose();
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
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: "#D4D2CC", width: 40 }}
      >
        <BottomSheetView className="flex-1 px-6">
          {showSuccess ? (
            <SuccessCelebration listName={listName.trim()} />
          ) : (
            <>
              {/* Header */}
              <View className="mb-6 flex-row items-center justify-center">
                <Text className="mr-2 text-xl">📝</Text>
                <Text className="text-lg font-semibold text-warm-gray-900">
                  New Shopping List
                </Text>
              </View>

              {/* List name input */}
              <Input
                label="List name"
                value={listName}
                onChangeText={(text) => {
                  setListName(text);
                  if (error) setError("");
                }}
                error={error}
                placeholder="e.g., Weekly Groceries"
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
                placeholder="e.g. £60"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />

              {/* Category selection */}
              <View className="mt-2">
                <Text className="mb-3 text-base font-medium text-warm-gray-700">
                  Category (optional)
                </Text>
                <View className="flex-row flex-wrap">
                  {CATEGORIES.map((category, index) => (
                    <CategoryChip
                      key={category.id}
                      {...category}
                      selected={selectedCategory === category.id}
                      onPress={() =>
                        setSelectedCategory(
                          selectedCategory === category.id ? null : category.id,
                        )
                      }
                      index={index}
                    />
                  ))}
                </View>
              </View>
              {/* Create button */}
              <View className="mt-2 pb-8">
                <Button
                  onPress={handleCreate}
                  variant="primary"
                  size="lg"
                  loading={isCreating}
                  disabled={!listName.trim()}
                  accessibilityLabel="Create shopping list"
                >
                  Create List
                </Button>
              </View>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);
