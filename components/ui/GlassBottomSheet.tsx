import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
  type BottomSheetProps,
  useBottomSheetSpringConfigs,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import React, {
  forwardRef,
  useCallback,
  useMemo,
} from "react";
import { Platform, View } from "react-native";
import Animated, { ReduceMotion } from "react-native-reanimated";
import { getGlassSheetMaterial } from "@/lib/bottomSheet";
import { GlassSurfaceProvider } from "./GlassSurfaceContext";
import { useReduceTransparency } from "./useReduceTransparency";

export type GlassBottomSheetRef = React.ElementRef<typeof BottomSheet>;

export interface GlassBottomSheetProps
  extends Omit<
    BottomSheetProps,
    | "animationConfigs"
    | "backdropComponent"
    | "backgroundComponent"
    | "backgroundStyle"
    | "handleIndicatorStyle"
    | "overrideReduceMotion"
  > {
  /** Prevent gesture and backdrop dismissal while a sheet action is in flight. */
  dismissible?: boolean;
}

/**
 * The app-wide bottom-sheet surface. It keeps focused tasks tactile and calm,
 * with one restrained system-material treatment and accessible fallbacks.
 */
export const GlassBottomSheet = forwardRef<
  GlassBottomSheetRef,
  GlassBottomSheetProps
>(function GlassBottomSheet(
  {
    dismissible = true,
    enableDynamicSizing = false,
    enablePanDownToClose = true,
    keyboardBehavior = "interactive",
    keyboardBlurBehavior = "restore",
    enableBlurKeyboardOnGesture = true,
    android_keyboardInputMode = "adjustResize",
    children,
    ...props
  },
  ref,
) {
  const reduceTransparency = useReduceTransparency();
  const material = useMemo(
    () => getGlassSheetMaterial({ reduceTransparency }),
    [reduceTransparency],
  );
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 34,
    stiffness: 440,
    mass: 1,
    overshootClamping: false,
    energyThreshold: 6e-9,
  });

  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={material.backdropOpacity}
        pressBehavior={dismissible ? "close" : "none"}
      />
    ),
    [dismissible, material.backdropOpacity],
  );

  const renderBackground = useCallback(
    ({ pointerEvents, style }: BottomSheetBackgroundProps) => (
      <Animated.View
        pointerEvents={pointerEvents}
        style={[
          style,
          {
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: "transparent",
            shadowColor: "#171714",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.16,
            shadowRadius: 26,
            elevation: 18,
          },
        ]}
      >
        <View
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: material.borderColor,
            backgroundColor:
              !reduceTransparency && Platform.OS === "ios"
                ? "transparent"
                : material.surfaceColor,
          }}
        >
          {!reduceTransparency && Platform.OS === "ios" ? (
            <BlurView
              tint={material.tint}
              intensity={material.blurIntensity}
              style={{ position: "absolute", inset: 0 }}
            />
          ) : null}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: material.highlightColor,
            }}
          />
        </View>
      </Animated.View>
    ),
    [material, reduceTransparency],
  );

  return (
    <BottomSheet
      ref={ref}
      {...props}
      animationConfigs={animationConfigs}
      backdropComponent={renderBackdrop}
      backgroundComponent={renderBackground}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={dismissible && enablePanDownToClose}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      enableBlurKeyboardOnGesture={enableBlurKeyboardOnGesture}
      android_keyboardInputMode={android_keyboardInputMode}
      overrideReduceMotion={ReduceMotion.System}
      handleIndicatorStyle={{
        width: 40,
        height: 5,
        backgroundColor: material.handleColor,
      }}
    >
      <GlassSurfaceProvider value>{children}</GlassSurfaceProvider>
    </BottomSheet>
  );
});

export {
  BottomSheetScrollView as GlassBottomSheetScrollView,
  BottomSheetView as GlassBottomSheetView,
};
