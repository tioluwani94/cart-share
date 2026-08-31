import { Tabs } from "expo-router";
import { BarChart3, CalendarDays, ShoppingBasket } from "lucide-react-native";
import { useEffect } from "react";
import { Platform } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { themeColors } from "@/lib/theme";

const TAB_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function AnimatedTabIcon({
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
        easing: TAB_EASE_OUT,
      }),
    );
  }, [focused, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.75, 1]),
    transform: [
      {
        scale: reduceMotion
          ? 1
          : interpolate(progress.get(), [0, 1], [0.96, 1]),
      },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: themeColors.surface,
          borderTopColor: themeColors.separator,
          height: Platform.OS === "ios" ? 86 : 72,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
        },
        tabBarActiveTintColor: themeColors.coral,
        tabBarInactiveTintColor: themeColors.secondaryInk,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <CalendarDays
                size={24}
                color={color}
                strokeWidth={2.25}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Shop",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <ShoppingBasket
                size={24}
                color={color}
                strokeWidth={2.25}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Spending",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <BarChart3
                size={24}
                color={color}
                strokeWidth={2.25}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
    </Tabs>
  );
}
