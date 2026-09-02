import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import {
  HEADER_BLUR_END,
  HEADER_COLLAPSE_END,
  HEADER_COLLAPSE_START,
} from "@/lib/collapsibleHeader";
import { getNextTabBarMode } from "@/lib/tabBarChrome";
import { ProgressiveBlurEdge } from "./ProgressiveBlurEdge";
import {
  setTabBarChromeMode,
  useTabBarChrome,
} from "./TabBarChromeContext";

const COMPACT_ROW_HEIGHT = 56;

export function useCollapsibleHeader() {
  const scrollY = useSharedValue(0);
  const previousOffsetY = useSharedValue(0);
  const { compactMode, compactProgress, reduceMotion } = useTabBarChrome();
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const rawOffsetY = event.contentOffset.y;
      const maxOffsetY = Math.max(
        0,
        event.contentSize.height - event.layoutMeasurement.height,
      );
      const clampedOffsetY = Math.min(
        Math.max(rawOffsetY, 0),
        maxOffsetY,
      );
      scrollY.set(Math.max(0, rawOffsetY));

      const nextMode = getNextTabBarMode({
        currentMode: compactMode.get(),
        maxOffsetY,
        offsetY: rawOffsetY,
        previousOffsetY: previousOffsetY.get(),
      });
      setTabBarChromeMode(
        compactMode,
        compactProgress,
        nextMode,
        reduceMotion,
      );
      previousOffsetY.set(clampedOffsetY);
    },
  });

  return { onScroll, scrollY };
}

interface CollapsibleTabHeaderProps {
  title: string;
  scrollY: SharedValue<number>;
  rightAction?: ReactNode;
  compactAccessory?: ReactNode;
  compactAccessoryHeight?: number;
}

export function CollapsibleTabHeader({
  title,
  scrollY,
  rightAction,
  compactAccessory,
  compactAccessoryHeight = 0,
}: CollapsibleTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const headerHeight =
    insets.top + COMPACT_ROW_HEIGHT + compactAccessoryHeight;

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.get(),
      [0, HEADER_BLUR_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const compactTitleStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.get(),
      [HEADER_COLLAPSE_START + 12, HEADER_COLLAPSE_END],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: progress,
      transform: reduceMotion
        ? []
        : [
            { translateY: interpolate(progress, [0, 1], [4, 0]) },
            { scale: interpolate(progress, [0, 1], [0.96, 1]) },
          ],
    };
  });
  const accessoryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.get(),
      [HEADER_COLLAPSE_START + 16, HEADER_COLLAPSE_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.header, { height: headerHeight }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, chromeStyle]}
      >
        <ProgressiveBlurEdge
          fadeEdge="bottom"
          falloff={64}
          spill={16}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[
          styles.compactRow,
          { top: insets.top, height: COMPACT_ROW_HEIGHT },
        ]}
      >
        <Animated.Text
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          numberOfLines={1}
          className="font-heading text-lg text-ink"
          style={[styles.compactTitle, compactTitleStyle]}
        >
          {title}
        </Animated.Text>
        {rightAction ? (
          <View pointerEvents="box-none" style={styles.rightAction}>
            {rightAction}
          </View>
        ) : null}
      </View>

      {compactAccessory ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.compactAccessory,
            {
              bottom: 0,
              height: compactAccessoryHeight,
            },
            accessoryStyle,
          ]}
        >
          {compactAccessory}
        </Animated.View>
      ) : null}
    </View>
  );
}

interface CollapsingLargeTitleRegionProps {
  scrollY: SharedValue<number>;
  children: ReactNode;
  className?: string;
}

export function CollapsingLargeTitleRegion({
  scrollY,
  children,
  className,
}: CollapsingLargeTitleRegionProps) {
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.get(),
      [HEADER_COLLAPSE_START, HEADER_COLLAPSE_END - 8],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: 1 - progress,
      transform: reduceMotion
        ? []
        : [
            { translateY: interpolate(progress, [0, 1], [0, -4]) },
            { scale: interpolate(progress, [0, 1], [1, 0.96]) },
          ],
    };
  });

  return (
    <Animated.View
      className={className}
      style={[styles.largeRegion, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

interface TabLargeTitleProps {
  title: string;
  subtitle: string;
  scrollY: SharedValue<number>;
}

export function TabLargeTitle({
  title,
  subtitle,
  scrollY,
}: TabLargeTitleProps) {
  return (
    <CollapsingLargeTitleRegion
      scrollY={scrollY}
      className="px-6 pb-5 pt-4"
    >
      <View className="pr-20">
        <Text
          accessibilityRole="header"
          className="text-4xl font-heading tracking-tight text-ink"
        >
          {title}
        </Text>
        <Text className="mt-1 text-base text-ink-secondary">
          {subtitle}
        </Text>
      </View>
    </CollapsingLargeTitleRegion>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: "visible",
  },
  compactRow: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  compactTitle: {
    position: "absolute",
    left: 82,
    right: 82,
    textAlign: "center",
  },
  rightAction: {
    position: "absolute",
    right: 24,
    top: 4,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  compactAccessory: {
    position: "absolute",
    left: 24,
    right: 24,
    justifyContent: "center",
  },
  largeRegion: {
    transformOrigin: "left top",
  },
});
