import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { OurPantryTabBar } from "@/components/navigation/OurPantryTabBar";
import { TabBarChromeProvider } from "@/components/navigation/TabBarChromeContext";

export default function TabsLayout() {
  return (
    <TabBarChromeProvider>
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
