import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  type SharedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { TabBarMode } from "@/lib/tabBarChrome";

const TAB_BAR_SETTLE = {
  duration: 400,
  dampingRatio: 1,
  overshootClamping: true,
} as const;

interface TabBarChromeContextValue {
  compactMode: SharedValue<TabBarMode>;
  compactProgress: SharedValue<number>;
  expandTabBar: () => void;
  footerAccessory: TabBarFooterAccessory | null;
  reduceMotion: boolean;
  setFooterAccessory: Dispatch<
    SetStateAction<TabBarFooterAccessory | null>
  >;
}

export interface TabBarFooterAccessory {
  content: ReactNode;
  height: number;
  id: string;
}

const TabBarChromeContext = createContext<TabBarChromeContextValue | null>(
  null,
);

export function setTabBarChromeMode(
  compactMode: SharedValue<TabBarMode>,
  compactProgress: SharedValue<number>,
  nextMode: TabBarMode,
  reduceMotion: boolean,
) {
  "worklet";
  if (compactMode.get() === nextMode) return;
  compactMode.set(nextMode);
  compactProgress.set(
    reduceMotion ? nextMode : withSpring(nextMode, TAB_BAR_SETTLE),
  );
}

export function TabBarChromeProvider({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const compactMode = useSharedValue<TabBarMode>(0);
  const compactProgress = useSharedValue(0);
  const [footerAccessory, setFooterAccessory] =
    useState<TabBarFooterAccessory | null>(null);

  const expandTabBar = useCallback(() => {
    setTabBarChromeMode(
      compactMode,
      compactProgress,
      0,
      reduceMotion,
    );
  }, [compactMode, compactProgress, reduceMotion]);

  const value = useMemo(
    () => ({
      compactMode,
      compactProgress,
      expandTabBar,
      footerAccessory,
      reduceMotion,
      setFooterAccessory,
    }),
    [
      compactMode,
      compactProgress,
      expandTabBar,
      footerAccessory,
      reduceMotion,
    ],
  );

  return (
    <TabBarChromeContext.Provider value={value}>
      {children}
    </TabBarChromeContext.Provider>
  );
}

export function useTabBarChrome() {
  const value = useContext(TabBarChromeContext);
  if (!value) {
    throw new Error(
      "useTabBarChrome must be used inside TabBarChromeProvider.",
    );
  }
  return value;
}
