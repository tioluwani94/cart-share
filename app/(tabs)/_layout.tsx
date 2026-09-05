import { api } from "@/convex/_generated/api";
import { useAnalytics } from "@/lib/AnalyticsContext";
import { useQuery } from "convex/react";
import { Tabs, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { OurPantryTabBar } from "@/components/navigation/OurPantryTabBar";
import { TabBarChromeProvider } from "@/components/navigation/TabBarChromeContext";

const tabByPathname = {
  "/": "plan",
  "/shop": "shop",
  "/pantry": "pantry",
  "/analytics": "spending",
} as const;

function TabAnalyticsTracker() {
  const pathname = usePathname();
  const analytics = useAnalytics();
  const household = useQuery(api.households.getCurrentHousehold);
  const lastTrackedKey = useRef<string | null>(null);

  useEffect(() => {
    const tab = tabByPathname[pathname as keyof typeof tabByPathname];
    if (!tab || !household?._id) return;
    const key = `${household._id}:${tab}`;
    if (lastTrackedKey.current === key) return;
    lastTrackedKey.current = key;
    analytics.track("tab viewed", {
      household_id: household._id,
      tab,
    });
  }, [analytics, household?._id, pathname]);

  return null;
}

export default function TabsLayout() {
  return (
    <TabBarChromeProvider>
      <TabAnalyticsTracker />
      <Tabs
        tabBar={(props) => <OurPantryTabBar {...props} />}
        screenOptions={{
          animation: "none",
          headerShown: false,
          // The Shop composer is owned by the shared footer dock and lifts
          // independently; the tab controls remain safely behind the keyboard.
          tabBarHideOnKeyboard: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: Platform.OS === "ios" ? 86 : 72,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Plan" }} />
        <Tabs.Screen name="shop" options={{ title: "Shop" }} />
        <Tabs.Screen name="pantry" options={{ title: "Pantry" }} />
        <Tabs.Screen name="analytics" options={{ title: "Spending" }} />
      </Tabs>
    </TabBarChromeProvider>
  );
}
