import { View, Text, Pressable } from "react-native";
import { Check, Trash2 } from "lucide-react-native";
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
  Easing,
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

const DELETE_THRESHOLD = -80;
const SWIPE_REVEAL_THRESHOLD = -40;

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
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    onDelete?.(id);
  }, [id, onDelete]);

  const handleEdit = useCallback(() => {
    triggerHaptic();
    onEdit?.({ id, name, quantity, unit, notes, category });
  }, [id, name, quantity, unit, notes, category, onEdit]);

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

  // Swipe gesture for delete
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe
      if (event.translationX < 0) {
        translateX.value = event.translationX;

        // Trigger haptic on reveal threshold
        if (event.translationX < SWIPE_REVEAL_THRESHOLD && !hasTriggeredRevealHaptic.value) {
          hasTriggeredRevealHaptic.value = true;
          runOnJS(triggerHaptic)();
        } else if (event.translationX > SWIPE_REVEAL_THRESHOLD) {
          hasTriggeredRevealHaptic.value = false;
        }
      }
    })
    .onEnd((event) => {
      if (event.translationX < DELETE_THRESHOLD) {
        // Delete the item
        runOnJS(triggerMediumHaptic)();
        translateX.value = withTiming(-400, { duration: 200 });
        itemHeight.value = withDelay(100, withTiming(0, { duration: 200 }));
        marginBottom.value = withDelay(100, withTiming(0, { duration: 200 }));
        opacity.value = withDelay(100, withTiming(0, { duration: 150 }));
        runOnJS(handleDelete)();
      } else {
        // Snap back
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

  // Background color intensifies as swipe progresses
  const deleteBackgroundStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, -40, -80, -120],
      [0, 0.3, 0.7, 1],
      Extrapolation.CLAMP
    );

    return {
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        ["#FEE2E2", "#EF4444"] // light red to red
      ),
      opacity: interpolate(
        translateX.value,
        [0, -20],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  // Trash icon scales up during swipe
  const trashIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      translateX.value,
      [0, -40, -80],
      [0.8, 1, 1.2],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity: interpolate(
        translateX.value,
        [0, -30],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

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
        {/* Delete background with trash icon */}
        <Animated.View
          style={[
            deleteBackgroundStyle,
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "flex-end",
              paddingRight: 24,
            },
          ]}
        >
          <Animated.View style={trashIconStyle}>
            <Trash2 size={22} color="#FFFFFF" strokeWidth={2} />
          </Animated.View>
        </Animated.View>

        {/* Swipeable item content */}
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={swipeAnimatedStyle}>
            <Pressable
              onPress={handleToggle}
              onLongPress={handleEdit}
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
              accessibilityLabel={`${name}${isCompleted ? ", checked" : ", unchecked"}. Long press to edit. Swipe left to delete.`}
              accessibilityActions={[
                { name: "activate", label: "Edit item" },
                { name: "delete", label: "Delete item" },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "delete") {
                  handleDelete();
                } else if (event.nativeEvent.actionName === "activate") {
                  handleEdit();
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

