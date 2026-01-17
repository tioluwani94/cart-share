import { View, Text, Pressable } from "react-native";
import { Check, Trash2, Pencil } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolateColor,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback } from "react";

interface ListItemProps {
  id: Id<"items">;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  isCompleted: boolean;
  onToggle: (itemId: Id<"items">) => void;
  onDelete?: (itemId: Id<"items">) => void;
  onEdit?: (item: {
    id: Id<"items">;
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    category?: string;
  }) => void;
  index: number;
}

const ACTION_BUTTON_WIDTH = 70;
const SWIPE_THRESHOLD = -50;
const SNAP_OPEN = -(ACTION_BUTTON_WIDTH * 2); // Two buttons

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Confetti particle component
function ConfettiParticle({
  emoji,
  delay,
  startX,
}: {
  emoji: string;
  delay: number;
  startX: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
    translateY.value = withDelay(
      delay,
      withTiming(-40, { duration: 600 })
    );
    translateX.value = withDelay(
      delay,
      withSpring(startX + (Math.random() - 0.5) * 30, { damping: 8 })
    );
    rotate.value = withDelay(
      delay,
      withTiming(Math.random() * 360, { duration: 600 })
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(300, withTiming(0, { duration: 150 }))
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Text
      style={[{ position: "absolute", fontSize: 12, left: 8 }, animatedStyle]}
    >
      {emoji}
    </Animated.Text>
  );
}

const CONFETTI_EMOJIS = ["✨", "🎉", "⭐", "💫", "✨"];

export function ListItem({
  id,
  name,
  quantity,
  unit,
  notes,
  category,
  isCompleted,
  onToggle,
  onDelete,
  onEdit,
  index,
}: ListItemProps) {
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(isCompleted ? 1 : 0);
  const checkmarkProgress = useSharedValue(isCompleted ? 1 : 0);
  const strikethroughProgress = useSharedValue(isCompleted ? 1 : 0);
  const textOpacity = useSharedValue(isCompleted ? 0.7 : 1);
  const [showConfetti, setShowConfetti] = useState(false);

  // Swipe gesture values
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(60);
  const marginBottom = useSharedValue(12);
  const opacity = useSharedValue(1);
  const hasTriggeredRevealHaptic = useSharedValue(false);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics not available
    }
  };

  const triggerMediumHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 800);
  };


  const handleToggle = () => {
    const newCompleted = !isCompleted;

    if (newCompleted) {
      // Checking animation: scale bounce 1.0 → 1.1 → 1.0
      scale.value = withSequence(
        withSpring(1.1, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
      fillProgress.value = withTiming(1, { duration: 200 });
      checkmarkProgress.value = withTiming(1, { duration: 250 });
      // Animate strikethrough and text fade
      strikethroughProgress.value = withDelay(100, withTiming(1, { duration: 200 }));
      textOpacity.value = withDelay(100, withTiming(0.7, { duration: 200 }));
      runOnJS(triggerHaptic)();
      runOnJS(triggerConfetti)();
    } else {
      // Unchecking animation
      fillProgress.value = withTiming(0, { duration: 150 });
      checkmarkProgress.value = withTiming(0, { duration: 100 });
      strikethroughProgress.value = withTiming(0, { duration: 150 });
      textOpacity.value = withTiming(1, { duration: 150 });
    }

    onToggle(id);
  };

  const checkboxContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkboxFillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      ["transparent", "#FF6B6B"]
    ),
    borderColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      ["#D3D0C9", "#FF6B6B"]
    ),
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkmarkProgress.value,
    transform: [
      { scale: checkmarkProgress.value },
      { rotate: `${-5 + checkmarkProgress.value * 5}deg` },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const strikethroughStyle = useAnimatedStyle(() => ({
    width: `${strikethroughProgress.value * 100}%`,
    opacity: strikethroughProgress.value,
  }));

  // Close swipe actions
  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    hasTriggeredRevealHaptic.value = false;
  }, [translateX, hasTriggeredRevealHaptic]);

  // Handle edit action from swipe button
  const handleEditAction = useCallback(() => {
    closeSwipe();
    triggerHaptic();
    onEdit?.({ id, name, quantity, unit, notes, category });
  }, [closeSwipe, id, name, quantity, unit, notes, category, onEdit]);

  // Handle delete action from swipe button
  const handleDeleteAction = useCallback(() => {
    triggerMediumHaptic();
    translateX.value = withTiming(-400, { duration: 200 });
    itemHeight.value = withDelay(100, withTiming(0, { duration: 200 }));
    marginBottom.value = withDelay(100, withTiming(0, { duration: 200 }));
    opacity.value = withDelay(100, withTiming(0, { duration: 150 }));
    onDelete?.(id);
  }, [translateX, itemHeight, marginBottom, opacity, id, onDelete]);

  // Swipe gesture to reveal action buttons
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Calculate new position based on current state and gesture
      const newTranslateX = event.translationX + (translateX.value < SNAP_OPEN / 2 ? SNAP_OPEN : 0);

      // Clamp between SNAP_OPEN and 0
      if (newTranslateX < SNAP_OPEN) {
        translateX.value = SNAP_OPEN;
      } else if (newTranslateX > 0) {
        translateX.value = 0;
      } else {
        translateX.value = newTranslateX;
      }

      // Trigger haptic on threshold
      if (translateX.value < SWIPE_THRESHOLD && !hasTriggeredRevealHaptic.value) {
        hasTriggeredRevealHaptic.value = true;
        runOnJS(triggerHaptic)();
      } else if (translateX.value > SWIPE_THRESHOLD) {
        hasTriggeredRevealHaptic.value = false;
      }
    })
    .onEnd((event) => {
      // Determine if we should snap open or closed based on velocity and position
      const shouldOpen = event.velocityX < -500 || (translateX.value < SWIPE_THRESHOLD && event.velocityX < 200);

      if (shouldOpen) {
        translateX.value = withSpring(SNAP_OPEN, { damping: 20, stiffness: 200 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        hasTriggeredRevealHaptic.value = false;
      }
    });

  // Animated styles for swipe
  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: itemHeight.value,
    marginBottom: marginBottom.value,
    opacity: opacity.value,
    overflow: "hidden" as const,
  }));

  // Action buttons container style
  const actionsContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, -30],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Format quantity display
  const quantityDisplay =
    quantity && quantity > 0
      ? unit
        ? `${quantity} ${unit}`
        : `x${quantity}`
      : null;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(300)}
      exiting={FadeOut.duration(200)}
      style={containerAnimatedStyle}
    >
      <View className="relative overflow-hidden rounded-2xl">
        {/* Action buttons revealed on swipe */}
        <Animated.View
          style={[
            actionsContainerStyle,
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              flexDirection: "row",
              borderRadius: 16,
              overflow: "hidden",
            },
          ]}
        >
          {/* Edit button */}
          <Pressable
            onPress={handleEditAction}
            className="h-full items-center justify-center bg-teal"
            style={{ width: ACTION_BUTTON_WIDTH }}
            accessibilityLabel="Edit item"
            accessibilityRole="button"
          >
            <Pencil size={20} color="#FFFFFF" strokeWidth={2} />
            <Text className="mt-1 text-xs font-medium text-white">Edit</Text>
          </Pressable>

          {/* Delete button */}
          <Pressable
            onPress={handleDeleteAction}
            className="h-full items-center justify-center bg-red-500"
            style={{ width: ACTION_BUTTON_WIDTH }}
            accessibilityLabel="Delete item"
            accessibilityRole="button"
          >
            <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
            <Text className="mt-1 text-xs font-medium text-white">Delete</Text>
          </Pressable>
        </Animated.View>

        {/* Swipeable item content */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={swipeAnimatedStyle}>
            <Pressable
              onPress={handleToggle}
              onLongPress={handleEditAction}
              delayLongPress={400}
              className="flex-row items-center rounded-2xl bg-white px-4 py-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isCompleted }}
              accessibilityLabel={`${name}${isCompleted ? ", checked" : ", unchecked"}. Swipe left for edit and delete options.`}
              accessibilityActions={[
                { name: "activate", label: "Edit item" },
                { name: "delete", label: "Delete item" },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "delete") {
                  handleDeleteAction();
                } else if (event.nativeEvent.actionName === "activate") {
                  handleEditAction();
                }
              }}
            >
              {/* Checkbox with confetti */}
              <View className="relative">
                <AnimatedPressable
                  onPress={handleToggle}
                  style={checkboxContainerStyle}
                  className="mr-4"
                >
                  <Animated.View
                    style={checkboxFillStyle}
                    className="h-7 w-7 items-center justify-center rounded-full border-2"
                  >
                    <Animated.View style={checkmarkStyle}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </Animated.View>
                  </Animated.View>
                </AnimatedPressable>

                {/* Confetti particles - 5 tiny particles */}
                {showConfetti &&
                  CONFETTI_EMOJIS.map((emoji, i) => (
                    <ConfettiParticle
                      key={i}
                      emoji={emoji}
                      delay={i * 50}
                      startX={(i - 2) * 8}
                    />
                  ))}
              </View>

              {/* Item name and quantity */}
              <View className="flex-1 flex-row items-center">
                <View className="relative flex-1">
                  <Animated.Text
                    style={textAnimatedStyle}
                    className={`text-base font-medium ${
                      isCompleted ? "text-warm-gray-400" : "text-warm-gray-800"
                    }`}
                    numberOfLines={2}
                  >
                    {name}
                  </Animated.Text>
                  {/* Animated strikethrough line */}
                  <Animated.View
                    style={[
                      strikethroughStyle,
                      {
                        position: "absolute",
                        height: 1.5,
                        backgroundColor: "#A3A096",
                        top: "50%",
                        left: 0,
                      },
                    ]}
                  />
                </View>

                {/* Quantity badge */}
                {quantityDisplay && (
                  <View
                    className={`ml-3 rounded-full px-3 py-1 ${
                      isCompleted ? "bg-warm-gray-200" : "bg-teal/20"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isCompleted ? "text-warm-gray-400" : "text-teal"
                      }`}
                    >
                      {quantityDisplay}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

