import { useState, useCallback, useMemo, forwardRef, useEffect } from "react";
import { View, Text, Pressable, TextInput, Keyboard, ScrollView } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button, Input } from "@/components/ui";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);

/**
 * Common unit options for items.
 */
const UNITS = [
  { id: "ct", label: "ct" },
  { id: "lbs", label: "lbs" },
  { id: "oz", label: "oz" },
  { id: "gal", label: "gal" },
  { id: "kg", label: "kg" },
  { id: "g", label: "g" },
  { id: "L", label: "L" },
  { id: "ml", label: "ml" },
  { id: "pkg", label: "pkg" },
  { id: "box", label: "box" },
];

/**
 * Unit chip component with selection animation.
 */
function UnitChip({
  id,
  label,
  selected,
  onPress,
}: {
  id: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
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
      className={`mr-2 mb-2 rounded-full px-4 py-2 ${
        selected ? "bg-teal" : "border border-warm-gray-200 bg-white"
      }`}
    >
      <Text
        className={`font-medium ${
          selected ? "text-white" : "text-warm-gray-700"
        }`}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/**
 * Quantity stepper component with playful number animation.
 */
function QuantityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const numberScale = useSharedValue(1);
  const numberOpacity = useSharedValue(1);

  const animatedNumberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
    opacity: numberOpacity.value,
  }));

  const animateNumber = () => {
    numberScale.value = withSequence(
      withTiming(1.3, { duration: 100, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
  };

  const handleDecrement = () => {
    if (value > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animateNumber();
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateNumber();
    onChange(value + 1);
  };

  return (
    <View className="flex-row items-center">
      {/* Decrement button */}
      <Pressable
        onPress={handleDecrement}
        disabled={value <= 0}
        className={`h-12 w-12 items-center justify-center rounded-2xl ${
          value <= 0 ? "bg-warm-gray-100" : "bg-warm-gray-200"
        }`}
        accessibilityLabel="Decrease quantity"
        accessibilityRole="button"
      >
        <Text
          className={`text-2xl font-bold ${
            value <= 0 ? "text-warm-gray-300" : "text-warm-gray-700"
          }`}
        >
          −
        </Text>
      </Pressable>

      {/* Quantity display */}
      <View className="mx-4 min-w-[60px] items-center">
        <AnimatedText
          style={animatedNumberStyle}
          className="text-3xl font-bold text-warm-gray-900"
        >
          {value}
        </AnimatedText>
      </View>

      {/* Increment button */}
      <Pressable
        onPress={handleIncrement}
        className="h-12 w-12 items-center justify-center rounded-2xl bg-teal"
        accessibilityLabel="Increase quantity"
        accessibilityRole="button"
      >
        <Text className="text-2xl font-bold text-white">+</Text>
      </Pressable>
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
  } | null;
}

/**
 * Bottom sheet for editing item details.
 */
export const EditItemSheet = forwardRef<BottomSheet, EditItemSheetProps>(
  function EditItemSheet({ onClose, item }, ref) {
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const updateItem = useMutation(api.items.update);
    const removeItem = useMutation(api.items.remove);

    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ["85%"], []);

    // Initialize form when item changes
    useEffect(() => {
      if (item) {
        setName(item.name);
        setQuantity(item.quantity ?? 1);
        setUnit(item.unit ?? null);
        setNotes(item.notes ?? "");
        setError("");
      }
    }, [item]);

    // Reset form state when sheet closes
    const resetForm = useCallback(() => {
      setName("");
      setQuantity(1);
      setUnit(null);
      setNotes("");
      setError("");
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
      [onClose, resetForm]
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const handleSave = async () => {
      Keyboard.dismiss();

      // Validate
      if (!name.trim()) {
        setError("Item name is required!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (!item) return;

      setError("");
      setIsSaving(true);

      try {
        await updateItem({
          itemId: item.id,
          name: name.trim(),
          quantity: quantity > 0 ? quantity : undefined,
          unit: unit ?? undefined,
          notes: notes.trim() || undefined,
        });

        // Success!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close the sheet
        if (ref && "current" in ref && ref.current) {
          ref.current.close();
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
        await removeItem({ itemId: item.id });

        // Success!
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Close the sheet
        if (ref && "current" in ref && ref.current) {
          ref.current.close();
        }
      } catch (err) {
        console.error("Failed to delete item:", err);
        setError("Couldn't delete this item. Please try again!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsDeleting(false);
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
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        >
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-center">
            <Text className="mr-2 text-xl">✏️</Text>
            <Text className="text-lg font-semibold text-warm-gray-900">
              Edit Item
            </Text>
          </View>

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
            <Text className="mb-3 text-base font-medium text-warm-gray-700">
              Quantity
            </Text>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </View>

          {/* Unit picker */}
          <View className="mb-6">
            <Text className="mb-3 text-base font-medium text-warm-gray-700">
              Unit (optional)
            </Text>
            <View className="flex-row flex-wrap">
              {UNITS.map((unitOption) => (
                <UnitChip
                  key={unitOption.id}
                  {...unitOption}
                  selected={unit === unitOption.id}
                  onPress={() =>
                    setUnit(unit === unitOption.id ? null : unitOption.id)
                  }
                />
              ))}
            </View>
          </View>

          {/* Notes textarea */}
          <View className="mb-6">
            <Text className="mb-3 text-base font-medium text-warm-gray-700">
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions..."
              placeholderTextColor="#A9A69E"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="min-h-[100px] rounded-2xl border-2 border-warm-gray-200 bg-white px-4 py-3 text-base text-warm-gray-900"
              accessibilityLabel="Notes"
            />
          </View>

          {/* Decorative grocery emojis */}
          <View className="mb-6 flex-row justify-center opacity-20">
            <Text className="text-2xl">🥬 🥕 🍎 🧀 🥖</Text>
          </View>

          {/* Action buttons */}
          <View className="gap-3">
            {/* Save button */}
            <Button
              onPress={handleSave}
              variant="primary"
              size="lg"
              loading={isSaving}
              disabled={!name.trim() || isDeleting}
              accessibilityLabel="Save changes"
            >
              Save Changes
            </Button>

            {/* Delete button */}
            <Pressable
              onPress={handleDelete}
              disabled={isSaving || isDeleting}
              className={`min-h-[56px] items-center justify-center rounded-2xl border-2 ${
                isSaving || isDeleting
                  ? "border-warm-gray-200"
                  : "border-red-500"
              }`}
              accessibilityLabel="Delete item"
              accessibilityRole="button"
            >
              <Text
                className={`text-base font-semibold ${
                  isSaving || isDeleting ? "text-warm-gray-400" : "text-red-500"
                }`}
              >
                {isDeleting ? "Deleting..." : "Delete Item"}
              </Text>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);
