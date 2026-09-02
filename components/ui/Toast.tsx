import { PAGE_HEADER_ROW_HEIGHT } from "@/lib/navigationGeometry";
import { themeColors } from "@/lib/theme";
import * as Haptics from "expo-haptics";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react-native";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_DURATION = 3000;
const SCREEN_READER_DURATION = 5000;
const ENTER_DURATION = 180;
const EXIT_DURATION = 150;
const HEADER_GAP = 8;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export type ToastTone = "success" | "error" | "warning" | "neutral";
export type ToastStrategy = "replace" | "queue";

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  duration?: number;
  strategy?: ToastStrategy;
  haptic?: boolean;
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number;
  haptic: boolean;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: () => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastCardProps extends ToastItem {
  onDismiss: (id: number) => void;
  top: number;
}

interface TonePresentation {
  Icon: LucideIcon;
  iconColor: string;
  iconBackground: string;
  hapticType?: Haptics.NotificationFeedbackType;
}

const TONE_PRESENTATION: Record<ToastTone, TonePresentation> = {
  success: {
    Icon: CircleCheck,
    iconColor: themeColors.teal,
    iconBackground: themeColors.tealSoft,
    hapticType: Haptics.NotificationFeedbackType.Success,
  },
  error: {
    Icon: CircleAlert,
    iconColor: themeColors.error,
    iconBackground: themeColors.coralSoft,
    hapticType: Haptics.NotificationFeedbackType.Error,
  },
  warning: {
    Icon: TriangleAlert,
    iconColor: themeColors.warningInk,
    iconBackground: "#FFF7CF",
    hapticType: Haptics.NotificationFeedbackType.Warning,
  },
  neutral: {
    Icon: Info,
    iconColor: themeColors.secondaryInk,
    iconBackground: "#F2F1EE",
  },
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

export function ToastProvider({ children }: ToastProviderProps) {
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);
  const currentToastRef = useRef<ToastItem | null>(null);
  const queueRef = useRef<ToastItem[]>([]);

  const presentToast = useCallback((toast: ToastItem | null) => {
    currentToastRef.current = toast;
    setCurrentToast(toast);
  }, []);

  const showToast = useCallback(
    ({
      message,
      tone = "success",
      duration = DEFAULT_DURATION,
      strategy = "replace",
      haptic = true,
    }: ToastOptions) => {
      const toast: ToastItem = {
        id: ++nextToastId,
        message,
        tone,
        duration,
        haptic,
      };

      if (!currentToastRef.current) {
        presentToast(toast);
        return;
      }

      if (strategy === "queue") {
        const duplicateExists = [
          currentToastRef.current,
          ...queueRef.current,
        ].some(
          (item) => item.message === toast.message && item.tone === toast.tone,
        );
        if (!duplicateExists) queueRef.current.push(toast);
        return;
      }

      queueRef.current = [];
      presentToast(toast);
    },
    [presentToast],
  );

  const dismissCurrentToast = useCallback(
    (id?: number) => {
      if (id !== undefined && currentToastRef.current?.id !== id) return;
      presentToast(queueRef.current.shift() ?? null);
    },
    [presentToast],
  );

  const dismissToast = useCallback(() => {
    queueRef.current = [];
    dismissCurrentToast();
  }, [dismissCurrentToast]);
  const contextValue = useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={styles.providerRoot}>
        {children}
        <ToastViewport toast={currentToast} onDismiss={dismissCurrentToast} />
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastItem | null;
  onDismiss: (id: number) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.viewport} testID="toast-host">
      {toast ? (
        <ToastCard
          key={toast.id}
          {...toast}
          top={insets.top + PAGE_HEADER_ROW_HEIGHT + HEADER_GAP}
          onDismiss={onDismiss}
        />
      ) : null}
    </View>
  );
}

function ToastCard({
  id,
  message,
  tone,
  duration,
  haptic,
  onDismiss,
  top,
}: ToastCardProps) {
  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(reduceMotion ? 0 : -8);
  const opacity = useSharedValue(0);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDismissingRef = useRef(false);
  const presentation = TONE_PRESENTATION[tone];
  const { Icon } = presentation;

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
    opacity.set(
      withTiming(0, { duration: EXIT_DURATION, easing: EASE_OUT }),
    );
    exitTimeoutRef.current = setTimeout(() => onDismiss(id), EXIT_DURATION);
  }, [id, onDismiss, opacity, reduceMotion, translateY]);

  useEffect(() => {
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

    if (haptic && presentation.hapticType) {
      void Haptics.notificationAsync(presentation.hapticType).catch(() => {
        // Haptics are supplementary; visual feedback remains authoritative.
      });
    }

    let active = true;
    let autoDismissTimeout: ReturnType<typeof setTimeout> | null = null;
    void AccessibilityInfo.isScreenReaderEnabled()
      .catch(() => false)
      .then((screenReaderEnabled) => {
        if (!active) return;
        const visibleDuration = screenReaderEnabled
          ? Math.max(duration, SCREEN_READER_DURATION)
          : duration;
        autoDismissTimeout = setTimeout(dismiss, visibleDuration);
      });

    return () => {
      active = false;
      if (autoDismissTimeout) clearTimeout(autoDismissTimeout);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [
    dismiss,
    duration,
    haptic,
    opacity,
    presentation.hapticType,
    reduceMotion,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toastPosition, { top }, animatedStyle]}
      testID="toast"
    >
      <View style={styles.toastSurface}>
        <View
          style={[
            styles.iconWell,
            { backgroundColor: presentation.iconBackground },
          ]}
        >
          <Icon
            size={20}
            color={presentation.iconColor}
            strokeWidth={2.25}
          />
        </View>
        <Text numberOfLines={2} style={styles.message}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
  viewport: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  toastPosition: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  toastSurface: {
    maxWidth: 360,
    minHeight: 52,
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
  iconWell: {
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
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
