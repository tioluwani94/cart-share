import { View, Text, Pressable } from "react-native";
import { Check, Trash2, Pencil, RefreshCw } from "lucide-react-native";
import { UserAvatar, useToast } from "@/components/ui";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Id } from "@/convex/_generated/dataModel";
import { type ReactNode, useEffect, useCallback, useState } from "react";
import { formatCurrencyFromPence } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { themeColors } from "@/lib/theme";
import {
  getListItemSwipePosition,
  getListItemSwipeSnapTarget,
  LIST_ITEM_ACTION_BUTTON_WIDTH,
  LIST_ITEM_SWIPE_OPEN,
} from "@/lib/listItemSwipe";

export interface ListItemEditPayload {
  id: Id<"items">;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  estimatedPricePence?: number;
}

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
  onDelete: (itemId: Id<"items">) => Promise<void>;
  onEdit: (item: ListItemEditPayload) => void;
  isSwipeOpen: boolean;
  onSwipeOpen: (itemId: Id<"items">) => void;
  onSwipeClose: (itemId: Id<"items">) => void;
}

const SWIPE_REVEAL_HAPTIC_THRESHOLD = -56;
const SWIPE_SETTLE = {
  duration: 260,
  dampingRatio: 1,
  overshootClamping: true,
} as const;
const ACTION_PRESS_IN_DURATION = 100;
const ACTION_PRESS_OUT_DURATION = 140;

function SwipeActionButton({
  accessibilityLabel,
  backgroundColor,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  backgroundColor: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const pressProgress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressProgress.value, [0, 1], [1, 0.84]),
    transform: [{ scale: interpolate(pressProgress.value, [0, 1], [1, 0.97]) }],
  }));

  const setPressed = (pressed: boolean) => {
    const nextProgress = pressed ? 1 : 0;
    pressProgress.value = reduceMotion
      ? nextProgress
      : withTiming(nextProgress, {
          duration: pressed
            ? ACTION_PRESS_IN_DURATION
            : ACTION_PRESS_OUT_DURATION,
          easing: Easing.out(Easing.quad),
        });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={{
        width: LIST_ITEM_ACTION_BUTTON_WIDTH,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[animatedStyle, { alignItems: "center" }]}>
        {icon}
        <Text className="mt-1 text-xs font-semibold text-white">{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

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
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
}: ListItemProps) {
  const reduceMotion = useReducedMotion();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  // Swipe gesture values
  const translateX = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
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
    triggerHaptic();
    onToggle(id);
  };

  // Follow props so partner updates and recycled rows stay visually correct.
  const checkboxFillStyle = {
    backgroundColor: isCompleted ? themeColors.teal : "transparent",
    borderColor: isCompleted ? themeColors.teal : themeColors.disabled,
  };
  const checkmarkStyle = { opacity: isCompleted ? 1 : 0 };
  const textCompletionStyle = { opacity: isCompleted ? 0.7 : 1 };

  const closeSwipe = useCallback(() => {
    translateX.value = reduceMotion ? 0 : withSpring(0, SWIPE_SETTLE);
    hasTriggeredRevealHaptic.value = false;
  }, [hasTriggeredRevealHaptic, reduceMotion, translateX]);

  useEffect(() => {
    if (!isSwipeOpen && translateX.value !== 0) closeSwipe();
  }, [closeSwipe, isSwipeOpen, translateX]);

  // Handle edit action from swipe button
  const handleEditAction = useCallback(() => {
    closeSwipe();
    onSwipeClose(id);
    onEdit({
      id,
      name,
      quantity,
      unit,
      notes,
      category,
      estimatedPricePence,
    });
    triggerHaptic();
  }, [
    category,
    closeSwipe,
    estimatedPricePence,
    id,
    name,
    notes,
    onEdit,
    onSwipeClose,
    quantity,
    unit,
  ]);

  // Handle delete action from swipe button
  const handleDeleteAction = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(id);
      triggerMediumHaptic();
      closeSwipe();
      onSwipeClose(id);
    } catch (error) {
      console.error("Failed to delete item:", error);
      translateX.value = reduceMotion
        ? LIST_ITEM_SWIPE_OPEN
        : withSpring(LIST_ITEM_SWIPE_OPEN, SWIPE_SETTLE);
      onSwipeOpen(id);
      showToast({
        message: "Couldn't delete this item. Please try again.",
        tone: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [
    closeSwipe,
    id,
    isDeleting,
    onDelete,
    onSwipeClose,
    onSwipeOpen,
    reduceMotion,
    showToast,
    translateX,
  ]);

  // Swipe gesture to reveal action buttons
  const swipeGesture = Gesture.Pan()
    .enabled(!isDeleting)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      gestureStartX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = getListItemSwipePosition(
        gestureStartX.value,
        event.translationX,
      );

      // Trigger haptic on threshold
      if (
        translateX.value < SWIPE_REVEAL_HAPTIC_THRESHOLD &&
        !hasTriggeredRevealHaptic.value
      ) {
        hasTriggeredRevealHaptic.value = true;
        runOnJS(triggerHaptic)();
      } else if (translateX.value > SWIPE_REVEAL_HAPTIC_THRESHOLD) {
        hasTriggeredRevealHaptic.value = false;
      }
    })
    .onEnd((event) => {
      const target = getListItemSwipeSnapTarget(
        translateX.value,
        event.velocityX,
      );
      translateX.value = reduceMotion
        ? target
        : withSpring(target, SWIPE_SETTLE);

      if (target === LIST_ITEM_SWIPE_OPEN) {
        runOnJS(onSwipeOpen)(id);
      } else {
        hasTriggeredRevealHaptic.value = false;
        runOnJS(onSwipeClose)(id);
      }
    });

  // Animated styles for swipe
  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Action buttons container style
  const actionsContainerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, -30],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [0, LIST_ITEM_SWIPE_OPEN],
          [8, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Format quantity display
  const quantityDisplay =
    quantity && quantity > 0
      ? unit
        ? `${quantity} ${unit}`
        : `x${quantity}`
      : null;

  return (
    <Animated.View>
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
          accessibilityElementsHidden={!isSwipeOpen}
          importantForAccessibility={
            isSwipeOpen ? "auto" : "no-hide-descendants"
          }
        >
          {/* Edit button */}
          <SwipeActionButton
            onPress={handleEditAction}
            accessibilityLabel="Edit item"
            backgroundColor={themeColors.secondaryInk}
            icon={
              <Pencil size={20} color={themeColors.surface} strokeWidth={2} />
            }
            label="Edit"
          />

          {/* Delete button */}
          <SwipeActionButton
            onPress={() => void handleDeleteAction()}
            accessibilityLabel="Delete item"
            backgroundColor={themeColors.error}
            disabled={isDeleting}
            icon={
              <Trash2 size={20} color={themeColors.surface} strokeWidth={2} />
            }
            label={isDeleting ? "Deleting" : "Delete"}
          />
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
                { name: "longpress" as const, label: "Edit item" },
                { name: "delete", label: "Delete item" },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "delete") {
                  void handleDeleteAction();
                } else if (event.nativeEvent.actionName === "longpress") {
                  handleEditAction();
                }
              }}
            >
              {/* The whole row is the checkbox target. */}
              <View className="relative mr-4" pointerEvents="none">
                <View>
                  <View
                    style={checkboxFillStyle}
                    className="h-7 w-7 items-center justify-center rounded-full border-2"
                  >
                    <View style={checkmarkStyle}>
                      <Check
                        size={14}
                        color={themeColors.surface}
                        strokeWidth={3}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Item name and quantity */}
              <View className="flex-1 flex-row items-center">
                <View className="flex-1">
                  <Animated.Text
                    style={[
                      textCompletionStyle,
                      isCompleted && {
                        textDecorationLine: "line-through",
                        textDecorationColor: themeColors.disabled,
                        textDecorationStyle: "solid",
                      },
                    ]}
                    className={cn(
                      "text-base font-medium",
                      isCompleted ? "text-warm-gray-400" : "text-warm-gray-800",
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
                  <View className="ml-2 shrink-0">
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
                  <View
                    className="ml-2"
                    accessibilityLabel="Pending sync"
                    accessibilityHint="This item will sync when you're back online"
                  >
                    <RefreshCw
                      size={16}
                      color={themeColors.warningInk}
                      strokeWidth={2}
                    />
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
