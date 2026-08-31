import { View, Text, Pressable } from "react-native";
import { Check, Trash2, Pencil, RefreshCw } from "lucide-react-native";
import { UserAvatar } from "@/components/ui";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolateColor,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useCallback } from "react";
import { formatCurrencyFromPence } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";

interface ListItemProps {
  id: Id<"items">;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  estimatedPricePence?: number;
  isCompleted: boolean;
  addedByUser?: {
    name?: string;
    imageUrl?: string;
  } | null;
  /** Whether this item is pending sync (created/modified offline) */
  isPendingSync?: boolean;
  onToggle: (itemId: Id<"items">) => void;
  onDelete?: (itemId: Id<"items">) => void;
  onEdit?: (item: {
    id: Id<"items">;
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    category?: string;
    estimatedPricePence?: number;
  }) => void;
}

const ACTION_BUTTON_WIDTH = 70;
const SWIPE_THRESHOLD = -50;
const SNAP_OPEN = -(ACTION_BUTTON_WIDTH * 2); // Two buttons

export function ListItem({
  id,
  name,
  quantity,
  unit,
  notes,
  category,
  estimatedPricePence,
  isCompleted,
  addedByUser,
  isPendingSync = false,
  onToggle,
  onDelete,
  onEdit,
}: ListItemProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(isCompleted ? 1 : 0);
  const checkmarkProgress = useSharedValue(isCompleted ? 1 : 0);
  const textOpacity = useSharedValue(isCompleted ? 0.7 : 1);
  // Sync indicator animation
  const syncRotation = useSharedValue(0);

  // Animate sync icon rotation when pending
  useEffect(() => {
    if (isPendingSync && !reduceMotion) {
      syncRotation.value = withRepeat(
        withTiming(360, { duration: 1500 }),
        -1, // Infinite repeat
        false, // Don't reverse
      );
    } else {
      syncRotation.value = 0;
    }
  }, [isPendingSync, reduceMotion, syncRotation]);

  const syncIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${syncRotation.value}deg` }],
  }));

  // Swipe gesture values
  const translateX = useSharedValue(0);
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

  const handleToggle = () => {
    const newCompleted = !isCompleted;

    if (newCompleted) {
      if (reduceMotion) {
        scale.value = 1;
        fillProgress.value = 1;
        checkmarkProgress.value = 1;
        textOpacity.value = 0.7;
        triggerHaptic();
        onToggle(id);
        return;
      }
      // Checking animation: short scale pulse
      scale.value = withSequence(
        withTiming(1.06, {
          duration: 100,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1, {
          duration: 140,
          easing: Easing.out(Easing.quad),
        }),
      );
      fillProgress.value = withTiming(1, { duration: 200 });
      checkmarkProgress.value = withTiming(1, { duration: 250 });
      // The native text decoration stays aligned with every font size.
      textOpacity.value = withDelay(100, withTiming(0.7, { duration: 200 }));
      runOnJS(triggerHaptic)();
    } else {
      // Unchecking animation
      fillProgress.value = reduceMotion
        ? 0
        : withTiming(0, { duration: 150 });
      checkmarkProgress.value = reduceMotion
        ? 0
        : withTiming(0, { duration: 100 });
      textOpacity.value = reduceMotion
        ? 1
        : withTiming(1, { duration: 150 });
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
      ["transparent", themeColors.teal],
    ),
    borderColor: interpolateColor(
      fillProgress.value,
      [0, 1],
      [themeColors.disabled, themeColors.teal],
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

  // Close swipe actions
  const closeSwipe = useCallback(() => {
    translateX.value = withSpring(0, { damping: 100, stiffness: 500 });
    hasTriggeredRevealHaptic.value = false;
  }, [translateX, hasTriggeredRevealHaptic]);

  // Handle edit action from swipe button
  const handleEditAction = useCallback(() => {
    closeSwipe();
    triggerHaptic();
    onEdit?.({
      id,
      name,
      quantity,
      unit,
      notes,
      category,
      estimatedPricePence,
    });
  }, [
    category,
    closeSwipe,
    estimatedPricePence,
    id,
    name,
    notes,
    onEdit,
    quantity,
    unit,
  ]);

  // Handle delete action from swipe button
  const handleDeleteAction = useCallback(() => {
    triggerMediumHaptic();
    translateX.value = withTiming(-400, { duration: 200 });
    opacity.value = withDelay(100, withTiming(0, { duration: 150 }));
    onDelete?.(id);
  }, [translateX, opacity, id, onDelete]);

  // Swipe gesture to reveal action buttons
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Calculate new position based on current state and gesture
      const newTranslateX =
        event.translationX + (translateX.value < SNAP_OPEN / 2 ? SNAP_OPEN : 0);

      // Clamp between SNAP_OPEN and 0
      if (newTranslateX < SNAP_OPEN) {
        translateX.value = SNAP_OPEN;
      } else if (newTranslateX > 0) {
        translateX.value = 0;
      } else {
        translateX.value = newTranslateX;
      }

      // Trigger haptic on threshold
      if (
        translateX.value < SWIPE_THRESHOLD &&
        !hasTriggeredRevealHaptic.value
      ) {
        hasTriggeredRevealHaptic.value = true;
        runOnJS(triggerHaptic)();
      } else if (translateX.value > SWIPE_THRESHOLD) {
        hasTriggeredRevealHaptic.value = false;
      }
    })
    .onEnd((event) => {
      // Determine if we should snap open or closed based on velocity and position
      const shouldOpen =
        event.velocityX < -500 ||
        (translateX.value < SWIPE_THRESHOLD && event.velocityX < 200);

      if (shouldOpen) {
        translateX.value = withSpring(SNAP_OPEN, {
          damping: 100,
          stiffness: 500,
        });
      } else {
        translateX.value = withSpring(0, { damping: 100, stiffness: 500 });
        hasTriggeredRevealHaptic.value = false;
      }
    });

  // Animated styles for swipe
  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    overflow: "hidden" as const,
  }));

  // Action buttons container style
  const actionsContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, -30],
      [0, 1],
      Extrapolation.CLAMP,
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
    <Animated.View style={containerAnimatedStyle}>
      <View className="relative overflow-hidden border-b border-separator">
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
              overflow: "hidden",
            },
          ]}
        >
          {/* Edit button */}
          <Pressable
            onPress={handleEditAction}
            className="h-full items-center justify-center bg-warm-gray-700"
            style={{ width: ACTION_BUTTON_WIDTH }}
            accessibilityLabel="Edit item"
            accessibilityRole="button"
          >
            <Pencil size={20} color={themeColors.surface} strokeWidth={2} />
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
            <Trash2 size={20} color={themeColors.surface} strokeWidth={2} />
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
              className="min-h-16 flex-row items-center bg-background-light px-1 py-3"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isCompleted }}
              accessibilityLabel={`${name}${isCompleted ? ", checked" : ", unchecked"}. Swipe left for edit and delete options.`}
              accessibilityActions={[
                ...(onEdit
                  ? [{ name: "longpress" as const, label: "Edit item" }]
                  : []),
                { name: "delete", label: "Delete item" },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "delete") {
                  handleDeleteAction();
                } else if (event.nativeEvent.actionName === "longpress") {
                  handleEditAction();
                }
              }}
            >
              {/* The whole row is the checkbox target. */}
              <View className="relative mr-4" pointerEvents="none">
                <Animated.View style={checkboxContainerStyle}>
                  <Animated.View
                    style={checkboxFillStyle}
                    className="h-7 w-7 items-center justify-center rounded-full border-2"
                  >
                    <Animated.View style={checkmarkStyle}>
                      <Check
                        size={14}
                        color={themeColors.surface}
                        strokeWidth={3}
                      />
                    </Animated.View>
                  </Animated.View>
                </Animated.View>
              </View>

              {/* Item name and quantity */}
              <View className="flex-1 flex-row items-center">
                <View className="flex-1">
                  <Animated.Text
                    style={[
                      textAnimatedStyle,
                      isCompleted && {
                        textDecorationLine: "line-through",
                        textDecorationColor: themeColors.disabled,
                        textDecorationStyle: "solid",
                      },
                    ]}
                    className={cn(
                      "text-base font-medium",
                      isCompleted
                        ? "text-warm-gray-400"
                        : "text-warm-gray-800",
                    )}
                    numberOfLines={2}
                  >
                    {name}
                  </Animated.Text>
                </View>

                {/* Quantity badge */}
                {quantityDisplay && (
                  <View
                    className={cn(
                      "ml-3 rounded-full px-3 py-1",
                      "bg-warm-gray-100",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm font-medium",
                        isCompleted
                          ? "text-warm-gray-400"
                          : "text-warm-gray-700",
                      )}
                    >
                      {quantityDisplay}
                    </Text>
                  </View>
                )}

                {estimatedPricePence !== undefined && (
                  <Text className="ml-2 text-sm font-medium text-warm-gray-500">
                    {formatCurrencyFromPence(estimatedPricePence)}
                  </Text>
                )}

                {/* Partner avatar */}
                {addedByUser && (
                  <View className="ml-2" style={{ marginRight: -4 }}>
                    <UserAvatar
                      name={addedByUser.name}
                      imageUrl={addedByUser.imageUrl}
                      size={24}
                      showTooltip={true}
                      tooltipPrefix="Added by"
                    />
                  </View>
                )}

                {/* Sync indicator for offline items */}
                {isPendingSync && (
                  <Animated.View
                    style={syncIconStyle}
                    className="ml-2"
                    accessibilityLabel="Pending sync"
                    accessibilityHint="This item will sync when you're back online"
                  >
                    <RefreshCw
                      size={16}
                      color={themeColors.warningInk}
                      strokeWidth={2}
                    />
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}
