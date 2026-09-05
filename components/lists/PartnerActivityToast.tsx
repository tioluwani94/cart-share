import { UserAvatar } from "@/components/ui";
import { PAGE_HEADER_ROW_HEIGHT } from "@/lib/navigationGeometry";
import { themeColors } from "@/lib/theme";
import { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENTER_DURATION = 180;
const EXIT_DURATION = 150;
const HEADER_GAP = 8;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

interface PartnerActivityToastProps {
  visible: boolean;
  partnerName: string;
  partnerImageUrl?: string;
  itemName: string;
  onDismiss: () => void;
  onPress?: () => void;
  duration?: number;
}

export function PartnerActivityToast({
  visible,
  partnerName,
  partnerImageUrl,
  itemName,
  onDismiss,
  onPress,
  duration = 3000,
}: PartnerActivityToastProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(reduceMotion ? 0 : -8);
  const opacity = useSharedValue(0);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDismissingRef = useRef(false);

  const dismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;

    cancelAnimation(translateY);
    cancelAnimation(opacity);
    if (!reduceMotion) {
      translateY.set(
        withTiming(-8, { duration: EXIT_DURATION, easing: EASE_OUT }),
      );
    }
    opacity.set(withTiming(0, { duration: EXIT_DURATION, easing: EASE_OUT }));
    exitTimeoutRef.current = setTimeout(onDismiss, EXIT_DURATION);
  }, [onDismiss, opacity, reduceMotion, translateY]);

  useEffect(() => {
    if (!visible) {
      isDismissingRef.current = false;
      translateY.set(reduceMotion ? 0 : -8);
      opacity.set(0);
      return;
    }

    isDismissingRef.current = false;
    translateY.set(
      reduceMotion
        ? 0
        : withTiming(0, { duration: ENTER_DURATION, easing: EASE_OUT }),
    );
    opacity.set(
      withTiming(1, {
        duration: reduceMotion ? EXIT_DURATION : ENTER_DURATION,
        easing: EASE_OUT,
      }),
    );

    const autoDismissTimeout = setTimeout(dismiss, duration);
    return () => {
      clearTimeout(autoDismissTimeout);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [dismiss, duration, opacity, reduceMotion, translateY, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  const firstName = partnerName?.split(" ")[0] || "Partner";
  const message = `${firstName} added ${itemName}`;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.position,
        { top: insets.top + PAGE_HEADER_ROW_HEIGHT + HEADER_GAP },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress ?? dismiss}
        hitSlop={8}
        accessibilityLabel={`${message}. Tap to view.`}
        accessibilityRole="button"
      >
        <View
          style={styles.surface}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <UserAvatar
            name={partnerName}
            imageUrl={partnerImageUrl}
            size={34}
            showTooltip={false}
          />
          <Text numberOfLines={2} style={styles.message}>
            {message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: "center",
  },
  surface: {
    maxWidth: 360,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themeColors.separator,
    backgroundColor: themeColors.surface,
    paddingVertical: 9,
    paddingHorizontal: 10,
    shadowColor: themeColors.ink,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  message: {
    maxWidth: 286,
    flexShrink: 1,
    marginLeft: 10,
    marginRight: 4,
    color: themeColors.ink,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 15,
    lineHeight: 20,
  },
});
