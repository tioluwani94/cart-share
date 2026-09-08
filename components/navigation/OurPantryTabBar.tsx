import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import {
  BarChart3,
  CalendarDays,
  PackageOpen,
  ShoppingBasket,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  getTabBarDockHeight,
  getTabBarIconTranslateY,
  getTabBarSegmentGeometry,
  TAB_BAR_COMPACT_EXTRA_INSET,
  TAB_BAR_COMPACT_HEIGHT,
  TAB_BAR_EXPANDED_HEIGHT,
  TAB_BAR_OUTER_MARGIN,
} from "@/lib/tabBarChrome";
import { themeColors } from "@/lib/theme";
import { useReduceTransparency } from "@/components/ui/useReduceTransparency";
import { ProgressiveBlurEdge } from "./ProgressiveBlurEdge";
import { useTabBarChrome } from "./TabBarChromeContext";

const AnimatedText = Animated.createAnimatedComponent(Text);
const ICON_SELECTION_EASE = Easing.bezier(0.23, 1, 0.32, 1);
const TAB_COUNT = 4;

const TAB_ITEMS: Record<string, { label: string; Icon: LucideIcon }> = {
  index: { label: "Plan", Icon: CalendarDays },
  shop: { label: "Shop", Icon: ShoppingBasket },
  pantry: { label: "Pantry", Icon: PackageOpen },
  analytics: { label: "Spending", Icon: BarChart3 },
};

function SelectedIconFeedback({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.set(
      withTiming(focused ? 1 : 0, {
        duration: reduceMotion ? 100 : 120,
        easing: ICON_SELECTION_EASE,
      }),
    );
  }, [focused, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.74, 1]),
    transform: [
      {
        scale: reduceMotion
          ? 1
          : interpolate(progress.get(), [0, 1], [0.96, 1]),
      },
    ],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

interface TabButtonProps {
  Icon: LucideIcon;
  compactProgress: SharedValue<number>;
  focused: boolean;
  index: number;
  label: string;
  onLongPress: () => void;
  onPress: () => void;
  width: number;
}

function TabButton({
  Icon,
  compactProgress,
  focused,
  index,
  label,
  onLongPress,
  onPress,
  width,
}: TabButtonProps) {
  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          getTabBarSegmentGeometry(
            width * TAB_COUNT + TAB_BAR_OUTER_MARGIN * 2,
            compactProgress.get(),
            index,
          ).center -
          (TAB_BAR_OUTER_MARGIN + (index + 0.5) * width),
      },
    ],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: getTabBarIconTranslateY(compactProgress.get()),
      },
    ],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      compactProgress.get(),
      [0, 0.72],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          compactProgress.get(),
          [0, 1],
          [0, 3],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onLongPress={onLongPress}
      onPress={onPress}
      pressRetentionOffset={16}
      style={[styles.tabButton, { width }]}
    >
      <Animated.View style={[styles.tabContent, contentStyle]}>
        <Animated.View style={iconStyle}>
          <SelectedIconFeedback focused={focused}>
            <Icon
              color={focused ? themeColors.coral : themeColors.secondaryInk}
              size={24}
              strokeWidth={2.25}
            />
          </SelectedIconFeedback>
        </Animated.View>
        <AnimatedText
          accessible={false}
          numberOfLines={1}
          style={[
            styles.tabLabel,
            { color: focused ? themeColors.coral : themeColors.secondaryInk },
            labelStyle,
          ]}
        >
          {label}
        </AnimatedText>
      </Animated.View>
    </Pressable>
  );
}

export function OurPantryTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const reduceTransparency = useReduceTransparency();
  const reduceMotion = useReducedMotion();
  const { compactProgress, expandTabBar, footerAccessory } = useTabBarChrome();
  const selectedIndex = useSharedValue(state.index);
  const expandedWidth = Math.max(0, viewportWidth - TAB_BAR_OUTER_MARGIN * 2);
  const compactScaleX =
    expandedWidth > 0
      ? Math.max(
          0,
          (expandedWidth - TAB_BAR_COMPACT_EXTRA_INSET * 2) / expandedWidth,
        )
      : 1;
  const compactScaleY = TAB_BAR_COMPACT_HEIGHT / TAB_BAR_EXPANDED_HEIGHT;
  const bottomOffset =
    Platform.OS === "ios" ? Math.max(insets.bottom - 12, 8) : 8;
  const tabBarFootprintHeight = Platform.OS === "ios" ? 86 : 72;
  const footprintHeight = getTabBarDockHeight(
    tabBarFootprintHeight,
    footerAccessory?.height,
  );
  const nativeGlassAvailable =
    Platform.OS === "ios" &&
    !reduceTransparency &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();
  const usesBlurFallback =
    Platform.OS === "ios" && !reduceTransparency && !nativeGlassAvailable;

  useEffect(() => {
    selectedIndex.set(
      reduceMotion
        ? state.index
        : withSpring(state.index, {
            duration: 400,
            dampingRatio: 1,
            overshootClamping: true,
          }),
    );
  }, [reduceMotion, selectedIndex, state.index]);

  const materialStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: interpolate(
          compactProgress.get(),
          [0, 1],
          [1, compactScaleX],
          Extrapolation.CLAMP,
        ),
      },
      {
        scaleY: interpolate(
          compactProgress.get(),
          [0, 1],
          [1, compactScaleY],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const indicatorStyle = useAnimatedStyle(() => {
    const segment = getTabBarSegmentGeometry(
      viewportWidth,
      compactProgress.get(),
      selectedIndex.get(),
    );
    return {
      height: segment.height,
      top: segment.top,
      transform: [
        {
          translateX: segment.left,
        },
      ],
      width: segment.width,
    };
  });

  return (
    <View
      pointerEvents="box-none"
      testID="tab-bar-footer-dock"
      style={[styles.footprint, { height: footprintHeight }]}
    >
      <View
        pointerEvents="none"
        testID="tab-bar-footer-material"
        style={[styles.materialBleed, { bottom: -insets.bottom }]}
      >
        <ProgressiveBlurEdge
          fadeEdge="top"
          falloff={64}
          materialIntensity={28}
          spill={16}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {footerAccessory ? (
        <View
          pointerEvents="box-none"
          testID="tab-bar-footer-accessory"
          style={[
            styles.accessoryFrame,
            {
              bottom: tabBarFootprintHeight,
              height: footerAccessory.height,
            },
          ]}
        >
          {footerAccessory.content}
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[styles.barFrame, { bottom: bottomOffset }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.materialShadow,
            {
              left: TAB_BAR_OUTER_MARGIN,
              width: expandedWidth,
            },
            materialStyle,
          ]}
        >
          <View
            style={[
              styles.materialClip,
              (reduceTransparency || Platform.OS !== "ios") &&
                styles.solidMaterial,
            ]}
          >
            {nativeGlassAvailable ? (
              <GlassView
                colorScheme="light"
                glassEffectStyle="regular"
                isInteractive={false}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
                tintColor="rgba(255, 255, 255, 0.14)"
              />
            ) : usesBlurFallback ? (
              <BlurView
                intensity={38}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
                tint="systemUltraThinMaterialLight"
              />
            ) : null}
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.selectionIndicator, indicatorStyle]}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.tabRow,
            {
              left: TAB_BAR_OUTER_MARGIN,
              width: expandedWidth,
            },
          ]}
        >
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const item = TAB_ITEMS[route.name];
            if (!item) return null;
            const descriptor = descriptors[route.key];
            const accessibilityLabel =
              descriptor.options.tabBarAccessibilityLabel ?? item.label;

            const onPress = () => {
              expandTabBar();
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };
            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabButton
                key={route.key}
                Icon={item.Icon}
                compactProgress={compactProgress}
                focused={focused}
                index={index}
                label={accessibilityLabel}
                onLongPress={onLongPress}
                onPress={onPress}
                width={expandedWidth / TAB_COUNT}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footprint: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "visible",
    zIndex: 30,
  },
  materialBleed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  barFrame: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TAB_BAR_EXPANDED_HEIGHT,
  },
  accessoryFrame: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2,
  },
  materialShadow: {
    position: "absolute",
    top: 0,
    height: TAB_BAR_EXPANDED_HEIGHT,
    borderRadius: 999,
    shadowColor: themeColors.ink,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 7,
  },
  materialClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.82)",
  },
  solidMaterial: {
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderColor: themeColors.separator,
  },
  selectionIndicator: {
    position: "absolute",
    left: 0,
    borderRadius: 999,
    backgroundColor: "rgba(201, 74, 74, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201, 74, 74, 0.12)",
  },
  tabRow: {
    position: "absolute",
    top: 0,
    height: TAB_BAR_EXPANDED_HEIGHT,
    flexDirection: "row",
  },
  tabButton: {
    height: TAB_BAR_EXPANDED_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    height: TAB_BAR_EXPANDED_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Nunito_800ExtraBold",
  },
});
