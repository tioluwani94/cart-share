import { useState, useCallback, useMemo, forwardRef, useEffect } from "react";
import { View, Text, Pressable, Keyboard } from "react-native";
import { Check, Pencil, Minus, Plus, Trash2 } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AmountInput,
  Button,
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassSheetHeader,
  type GlassBottomSheetRef,
  Input,
} from "@/components/ui";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  formatCurrencyFromPence,
  parseCurrencyInputToPence,
} from "@/lib/formatters";
import { themeColors } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Common unit options for items.
 */
const UNITS = [
  { id: "each", label: "each" },
  { id: "g", label: "g" },
  { id: "kg", label: "kg" },
  { id: "ml", label: "ml" },
  { id: "l", label: "l" },
  { id: "pack", label: "pack" },
  { id: "tin", label: "tin" },
  { id: "bottle", label: "bottle" },
  { id: "bag", label: "bag" },
  { id: "box", label: "box" },
];

/**
 * Unit chip component with selection animation.
 */
function UnitChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!reduceMotion) {
      scale.value = withSpring(0.97, {
        damping: 28,
        stiffness: 520,
        mass: 0.7,
        overshootClamping: true,
      });
    }
  };

  const handlePressOut = () => {
    scale.value = reduceMotion
      ? 1
      : withSpring(1, {
          damping: 28,
          stiffness: 520,
          mass: 0.7,
          overshootClamping: true,
        });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      accessibilityLabel={`${label} unit${selected ? ", selected" : ""}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 min-h-12 flex-row items-center rounded-full border px-4 ${
        selected
          ? "border-coral/30 bg-coral-soft"
          : "border-separator bg-surface"
      }`}
    >
      <Text
        className={`font-semibold ${
          selected ? "text-coral" : "text-ink-secondary"
        }`}
      >
        {label}
      </Text>
      {selected ? (
        <Check
          size={15}
          color={themeColors.coral}
          strokeWidth={2.5}
          style={{ marginLeft: 7 }}
        />
      ) : null}
    </AnimatedPressable>
  );
}

/**
 * Compact quantity stepper with restrained, shared button feedback.
 */
function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const handleDecrement = () => {
    if (value > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value + 1);
  };

  return (
    <View className="flex-row items-center">
      <Button
        onPress={handleDecrement}
        disabled={value <= 0}
        variant="outline"
        size="sm"
        iconOnly
        accessibilityLabel="Decrease quantity"
      >
        <Minus
          size={20}
          color={value <= 0 ? themeColors.disabled : themeColors.secondaryInk}
          strokeWidth={2.5}
        />
      </Button>

      <View className="mx-4 min-w-[60px] items-center">
        <Text
          className="text-3xl text-ink"
          style={{ fontFamily: "Nunito_900Black" }}
        >
          {value}
        </Text>
      </View>

      <Button
        onPress={handleIncrement}
        variant="tonal"
        size="sm"
        iconOnly
        accessibilityLabel="Increase quantity"
      >
        <Plus size={20} color={themeColors.coral} strokeWidth={2.5} />
      </Button>
    </View>
  );
}

interface EditItemSheetProps {
  onClose: () => void;
  item: {
    id: Id<"items">;
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    category?: string;
    estimatedPricePence?: number;
  } | null;
  /** Callback to update item (supports offline mode) */
  onUpdate?: (
    itemId: Id<"items">,
    updates: {
      name?: string;
      quantity?: number;
      unit?: string;
      notes?: string;
      category?: string;
      estimatedPricePence?: number | null;
    }
  ) => Promise<void>;
  /** Callback to delete item (supports offline mode) */
  onDelete?: (itemId: Id<"items">) => Promise<void>;
}

/**
 * Bottom sheet for editing item details.
 */
export const EditItemSheet = forwardRef<GlassBottomSheetRef, EditItemSheetProps>(
  function EditItemSheet({ onClose, item, onUpdate, onDelete }, ref) {
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [estimatedPrice, setEstimatedPrice] = useState("");
    const [estimatedPriceError, setEstimatedPriceError] = useState("");
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fallback mutations for when callbacks aren't provided
    const updateItemMutation = useMutation(api.items.update);
    const removeItemMutation = useMutation(api.items.remove);

    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ["85%"], []);

    // Initialize form when item changes
    useEffect(() => {
      if (item) {
        setName(item.name);
        setQuantity(item.quantity ?? 1);
        setUnit(item.unit ?? null);
        setNotes(item.notes ?? "");
        setEstimatedPrice(
          item.estimatedPricePence === undefined
            ? ""
            : formatCurrencyFromPence(item.estimatedPricePence).replace("£", ""),
        );
        setError("");
        setEstimatedPriceError("");
      }
    }, [item]);

    // Reset form state when sheet closes
    const resetForm = useCallback(() => {
      setName("");
      setQuantity(1);
      setUnit(null);
      setNotes("");
      setEstimatedPrice("");
      setError("");
      setEstimatedPriceError("");
      setIsSaving(false);
      setIsDeleting(false);
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

    const dismissSheet = useCallback(() => {
      if (isSaving || isDeleting) return;
      if (ref && typeof ref !== "function") {
        ref.current?.dismiss();
      }
    }, [isDeleting, isSaving, ref]);

    const handleSave = async () => {
      Keyboard.dismiss();

      // Validate
      if (!name.trim()) {
        setError("Item name is required!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (!item) return;

      const estimatedPricePence = estimatedPrice.trim()
        ? parseCurrencyInputToPence(estimatedPrice)
        : null;
      if (estimatedPrice.trim() && estimatedPricePence === null) {
        setEstimatedPriceError("Enter a valid amount");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setError("");
      setEstimatedPriceError("");
      setIsSaving(true);

      const updates = {
        name: name.trim(),
        quantity: quantity > 0 ? quantity : undefined,
        unit: unit ?? undefined,
        notes: notes.trim() || undefined,
        estimatedPricePence,
      };

      try {
        // Use callback if provided (supports offline mode), otherwise use direct mutation
        if (onUpdate) {
          await onUpdate(item.id, updates);
        } else {
          await updateItemMutation({ itemId: item.id, ...updates });
        }

        // Success!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close the sheet
        if (ref && "current" in ref && ref.current) {
          ref.current.dismiss();
        }
      } catch (err) {
        console.error("Failed to update item:", err);
        setError("Something went wrong. Please try again!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!item) return;

      setIsDeleting(true);

      try {
        // Use callback if provided (supports offline mode), otherwise use direct mutation
        if (onDelete) {
          await onDelete(item.id);
        } else {
          await removeItemMutation({ itemId: item.id });
        }

        // Success!
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Close the sheet
        if (ref && "current" in ref && ref.current) {
          ref.current.dismiss();
        }
      } catch (err) {
        console.error("Failed to delete item:", err);
        setError("Couldn't delete this item. Please try again!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsDeleting(false);
      }
    };

    return (
      <GlassBottomSheet
        ref={ref}
        snapPoints={snapPoints}
        onDismiss={() => handleSheetChange(-1)}
        dismissible={!isSaving && !isDeleting}
      >
        <GlassBottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        >
          <GlassSheetHeader
            title="Edit item"
            description="Update the details your household sees in this shop."
            icon={
              <Pencil size={21} color={themeColors.coral} strokeWidth={2} />
            }
            onClose={dismissSheet}
            closeDisabled={isSaving || isDeleting}
            closeAccessibilityLabel="Close item editor"
          />

          {/* Item name input */}
          <Input
            label="Item name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError("");
            }}
            error={error}
            placeholder="e.g., Organic Milk"
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Quantity stepper */}
          <View className="mb-6">
            <Text className="mb-3 text-[15px] font-semibold leading-5 text-ink">
              Quantity
            </Text>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </View>

          {/* Unit picker */}
          <View className="mb-6">
            <Text className="mb-3 text-[15px] font-semibold leading-5 text-ink">
              Unit (optional)
            </Text>
            <View className="flex-row flex-wrap">
              {UNITS.map((unitOption) => (
                <UnitChip
                  key={unitOption.id}
                  label={unitOption.label}
                  selected={unit === unitOption.id}
                  onPress={() =>
                    setUnit(unit === unitOption.id ? null : unitOption.id)
                  }
                />
              ))}
            </View>
          </View>

          {/* Notes textarea */}
          <AmountInput
            label="Estimated price (optional)"
            value={estimatedPrice}
            onChangeText={(value) => {
              setEstimatedPrice(value);
              setEstimatedPriceError("");
            }}
            error={estimatedPriceError}
            placeholder="e.g. 2.50"
          />

          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special instructions…"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="min-h-[100px] py-3"
          />

          {/* Action buttons */}
          <View>
            <Button
              onPress={handleSave}
              variant="primary"
              size="lg"
              loading={isSaving}
              disabled={!name.trim() || isDeleting}
              accessibilityLabel="Save changes"
              className="w-full"
            >
              Save changes
            </Button>

            <Button
              onPress={handleDelete}
              disabled={isSaving || isDeleting}
              loading={isDeleting}
              variant="ghost"
              size="lg"
              className="mt-2 w-full"
              accessibilityLabel="Delete item"
            >
              <Trash2
                size={18}
                color={
                  isSaving || isDeleting
                    ? themeColors.disabled
                    : themeColors.error
                }
                strokeWidth={2}
              />
              <Text className="ml-2 text-base font-semibold text-red-700">
                Delete item
              </Text>
            </Button>
          </View>
        </GlassBottomSheetScrollView>
      </GlassBottomSheet>
    );
  },
);
