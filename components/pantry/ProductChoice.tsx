import { cn } from "@/lib/cn";
import { pantryArtwork } from "@/lib/pantryArtwork";
import { resolvePantryArtwork } from "@/lib/pantryCatalogue";
import { themeColors } from "@/lib/theme";
import { Image } from "expo-image";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  cubicBezier,
  Easing,
  FadeIn,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_DURATION_MS = "120ms";
const PRESS_EASING = cubicBezier(0.23, 1, 0.32, 1);
const CHECK_ENTER = ZoomIn.duration(160)
  .easing(Easing.bezier(0.23, 1, 0.32, 1))
  .withInitialValues({ opacity: 0, transform: [{ scale: 0.95 }] });
const CHECK_ENTER_REDUCED = FadeIn.duration(140).easing(
  Easing.bezier(0.23, 1, 0.32, 1),
);

export function ProductChoice({
  label,
  selected,
  onPress,
  disabled = false,
  detail,
  testIDPrefix = "activation",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  detail?: string;
  testIDPrefix?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const { fontScale } = useWindowDimensions();
  const artwork = pantryArtwork[resolvePantryArtwork(label)];
  // Reuse the catalogue's optical sizing, with clearance for the checkbox.
  const artworkScale = 0.72;

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      className={cn(
        "relative items-center rounded-3xl border px-3 pb-4 pt-7",
        fontScale >= 1.6 ? "w-full" : "w-[48.5%]",
        selected
          ? "border-coral bg-coral-soft"
          : "border-warm-gray-200 bg-white",
      )}
      style={{
        backgroundColor: selected ? themeColors.coralSoft : themeColors.surface,
        opacity: disabled ? 0.65 : pressed ? 0.84 : 1,
        transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }],
        transitionProperty: reduceMotion
          ? ["opacity", "backgroundColor", "borderColor"]
          : ["opacity", "transform", "backgroundColor", "borderColor"],
        transitionDuration: PRESS_DURATION_MS,
        transitionTimingFunction: PRESS_EASING,
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="items-center overflow-hidden"
        style={{ width: 140 * artworkScale, height: 162 * artworkScale }}
      >
        <Image
          testID={`${testIDPrefix}-product-artwork-${label}`}
          source={artwork.source}
          contentFit="contain"
          transition={0}
          accessible={false}
          style={{
            position: "absolute",
            width: artwork.size * artworkScale,
            height: artwork.size * artworkScale,
            bottom: artwork.bottom * artworkScale,
          }}
        />
      </View>
      <Text
        className={cn(
          "mt-2 text-center font-heading text-base leading-6",
          selected ? "text-coral" : "text-warm-gray-900",
        )}
      >
        {label}
      </Text>
      {detail && (
        <Text className="mt-1 text-center text-sm leading-5 text-ink-secondary">
          {detail}
        </Text>
      )}
      <View
        testID={`${testIDPrefix}-product-checkbox-${label}`}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn(
          "absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full",
          selected ? "bg-coral" : "border border-warm-gray-300",
        )}
      >
        {selected && (
          <Animated.View
            entering={reduceMotion ? CHECK_ENTER_REDUCED : CHECK_ENTER}
          >
            <Check size={15} color="#FFFFFF" />
          </Animated.View>
        )}
      </View>
    </AnimatedPressable>
  );
}
