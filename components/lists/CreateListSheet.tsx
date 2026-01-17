import { useState, useCallback, useMemo, useEffect, forwardRef } from "react";
import { View, Text, Pressable, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, Input } from "@/components/ui";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  FadeIn,
  FadeInUp,
  Easing,
} from "react-native-reanimated";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Category options with playful icons.
 */
const CATEGORIES = [
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "costco", label: "Costco", icon: "📦" },
  { id: "target", label: "Target", icon: "🎯" },
  { id: "pharmacy", label: "Pharmacy", icon: "💊" },
  { id: "other", label: "Other", icon: "📝" },
];

/**
 * Category chip component with selection animation.
 */
function CategoryChip({
  id,
  label,
  icon,
  selected,
  onPress,
  index,
}: {
  id: string;
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
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
      accessibilityLabel={`${label} category${selected ? ", selected" : ""}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`mr-2 mb-2 flex-row items-center rounded-full px-4 py-2.5 ${
        selected ? "bg-teal" : "border border-warm-gray-200 bg-white"
      }`}
    >
      <Text className="mr-1.5 text-lg">{icon}</Text>
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
 * Celebration particle for success animation.
 */
function ConfettiParticle({ emoji, delay }: { emoji: string; delay: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 150;

    translateY.value = withDelay(
      delay,
      withTiming(-200, { duration: 1500, easing: Easing.out(Easing.ease) }),
    );
    translateX.value = withDelay(
      delay,
      withTiming(randomX, { duration: 1500, easing: Easing.out(Easing.ease) }),
    );
    opacity.value = withDelay(delay + 800, withTiming(0, { duration: 700 }));
    rotation.value = withDelay(
      delay,
      withTiming(Math.random() * 360, { duration: 1500 }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={animatedStyle} className="absolute text-3xl">
      {emoji}
    </Animated.Text>
  );
}

/**
 * Success celebration overlay.
 */
function SuccessCelebration({ listName }: { listName: string }) {
  const scale = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    checkScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const confettiEmojis = ["🎉", "✨", "🌟", "💫", "🎊", "⭐"];

  return (
    <View className="absolute inset-0 items-center justify-center rounded-t-3xl bg-white">
      {/* Confetti particles */}
      <View className="absolute items-center justify-center">
        {confettiEmojis.map((emoji, i) => (
          <ConfettiParticle key={i} emoji={emoji} delay={i * 100} />
        ))}
      </View>

      <Animated.View style={containerStyle} className="items-center">
        {/* Check circle */}
        <Animated.View
          style={checkStyle}
          className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-teal"
        >
          <Text className="text-3xl text-white">✓</Text>
        </Animated.View>

        <Animated.Text
          entering={FadeIn.delay(300).duration(400)}
          className="text-xl font-bold text-warm-gray-900"
        >
          List created!
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(400).duration(400)}
          className="mt-2 text-center text-warm-gray-600"
        >
          "{listName}" is ready for shopping 🛒
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

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

    // Get current household
    const household = useQuery(api.households.getCurrentHousehold);
    const createList = useMutation(api.lists.create);

    // Snap points for the bottom sheet
    const snapPoints = useMemo(() => ["75%"], []);

    // Reset form state when sheet closes
    const resetForm = useCallback(() => {
      setListName("");
      setSelectedCategory(null);
      setError("");
      setIsCreating(false);
      setShowSuccess(false);
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
      (props: any) => (
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

      setError("");
      setIsCreating(true);

      try {
        const result = await createList({
          householdId: household._id,
          name: listName.trim(),
          category: selectedCategory ?? undefined,
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

              {/* Decorative illustration */}
              <View className="mt-6 items-center opacity-20">
                <Text className="text-5xl">🛒 🥬 🍎 🥛</Text>
              </View>

              {/* Create button */}
              <View className="mt-auto pb-8">
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
