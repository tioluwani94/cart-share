import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
  type BottomSheetModalProps,
  useBottomSheetSpringConfigs,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import { cssInterop } from "nativewind";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  Keyboard,
  Platform,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from "react-native";
import Animated, { ReduceMotion } from "react-native-reanimated";
import { getGlassSheetMaterial } from "@/lib/bottomSheet";
import {
  dismissKeyboard,
  dismissKeyboardForOutsideTouch,
} from "@/lib/keyboard";
import { GlassSurfaceProvider } from "./GlassSurfaceContext";
import {
  SheetInputFocusProvider,
  SheetTextInputProvider,
  type SheetTextInputComponent,
} from "./SheetTextInputContext";
import { useReduceTransparency } from "./useReduceTransparency";

const StyledBottomSheetTextInput = cssInterop(BottomSheetTextInput, {
  className: "style",
}) as SheetTextInputComponent;

export type GlassBottomSheetRef = React.ElementRef<typeof BottomSheetModal>;

export interface GlassBottomSheetProps extends Omit<
  BottomSheetModalProps,
  | "animationConfigs"
  | "backdropComponent"
  | "backgroundComponent"
  | "backgroundStyle"
  | "children"
  | "handleIndicatorStyle"
  | "overrideReduceMotion"
> {
  /** Prevent gesture and backdrop dismissal while a sheet action is in flight. */
  dismissible?: boolean;
  /** Use an immersive opaque surface for media viewers that should not inherit glass. */
  surfaceVariant?: "glass" | "solid-dark";
  children: React.ReactNode;
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
    surfaceVariant = "glass",
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
  const usesSolidDarkSurface = surfaceVariant === "solid-dark";
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
            backgroundColor: usesSolidDarkSurface ? "#000000" : "transparent",
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
            borderColor: usesSolidDarkSurface
              ? "#000000"
              : material.borderColor,
            backgroundColor: usesSolidDarkSurface
              ? "#000000"
              : !reduceTransparency && Platform.OS === "ios"
                ? "transparent"
                : material.surfaceColor,
          }}
        >
          {!usesSolidDarkSurface &&
          !reduceTransparency &&
          Platform.OS === "ios" ? (
            <BlurView
              tint={material.tint}
              intensity={material.blurIntensity}
              style={{ position: "absolute", inset: 0 }}
            />
          ) : null}
          {!usesSolidDarkSurface ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: material.highlightColor,
              }}
            />
          ) : null}
        </View>
      </Animated.View>
    ),
    [material, reduceTransparency, usesSolidDarkSurface],
  );

  return (
    <BottomSheetModal
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
      enableDismissOnClose
      overrideReduceMotion={ReduceMotion.System}
      handleIndicatorStyle={{
        width: 40,
        height: 5,
        backgroundColor: usesSolidDarkSurface
          ? "rgba(255, 255, 255, 0.36)"
          : material.handleColor,
      }}
    >
      <SheetTextInputProvider value={StyledBottomSheetTextInput}>
        <GlassSurfaceProvider value={!usesSolidDarkSurface}>
          {children}
        </GlassSurfaceProvider>
      </SheetTextInputProvider>
    </BottomSheetModal>
  );
});

type GlassBottomSheetScrollViewProps = React.ComponentProps<
  typeof BottomSheetScrollView
>;

type GlassBottomSheetScrollViewRef = React.ElementRef<
  typeof BottomSheetScrollView
>;

const FOCUSED_INPUT_KEYBOARD_GAP = 24;

export const GlassBottomSheetScrollView = forwardRef<
  GlassBottomSheetScrollViewRef,
  GlassBottomSheetScrollViewProps
>(function GlassBottomSheetScrollView(
  {
    children,
    keyboardDismissMode = "on-drag",
    keyboardShouldPersistTaps = "handled",
    onScrollBeginDrag,
    onStartShouldSetResponderCapture,
    ...props
  },
  forwardedRef,
) {
  const scrollViewRef = useRef<GlassBottomSheetScrollViewRef>(null);
  const focusedInputTargetRef = useRef<number | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => scrollViewRef.current as GlassBottomSheetScrollViewRef,
  );

  const revealFocusedInput = useCallback(() => {
    const focusedInputTarget = focusedInputTargetRef.current;
    if (focusedInputTarget === null) return;

    scrollViewRef.current
      ?.getScrollResponder()
      ?.scrollResponderScrollNativeHandleToKeyboard(
        focusedInputTarget,
        FOCUSED_INPUT_KEYBOARD_GAP,
        true,
      );
  }, []);

  const requestInputFocus = useCallback(
    (nativeTarget: number) => {
      focusedInputTargetRef.current = nativeTarget;
      revealFocusedInput();
    },
    [revealFocusedInput],
  );

  useEffect(() => {
    const keyboardShown = Keyboard.addListener(
      "keyboardDidShow",
      revealFocusedInput,
    );
    const keyboardHidden = Keyboard.addListener("keyboardDidHide", () => {
      focusedInputTargetRef.current = null;
    });

    return () => {
      keyboardShown.remove();
      keyboardHidden.remove();
    };
  }, [revealFocusedInput]);

  return (
    <BottomSheetScrollView
      ref={scrollViewRef}
      {...props}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      onScrollBeginDrag={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        dismissKeyboard();
        onScrollBeginDrag?.(event);
      }}
      onStartShouldSetResponderCapture={(event: GestureResponderEvent) => {
        dismissKeyboardForOutsideTouch(event);
        return onStartShouldSetResponderCapture?.(event) ?? false;
      }}
    >
      <SheetInputFocusProvider value={requestInputFocus}>
        {children}
      </SheetInputFocusProvider>
    </BottomSheetScrollView>
  );
});

type GlassBottomSheetViewProps = React.ComponentProps<typeof BottomSheetView>;

/** Non-scrolling sheet content gets the same outside-tap escape as screens. */
export function GlassBottomSheetView({
  onStartShouldSetResponderCapture,
  ...props
}: GlassBottomSheetViewProps) {
  return (
    <BottomSheetView
      {...props}
      onStartShouldSetResponderCapture={(event) => {
        dismissKeyboardForOutsideTouch(event);
        return onStartShouldSetResponderCapture?.(event) ?? false;
      }}
    />
  );
}
