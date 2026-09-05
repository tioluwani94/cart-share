import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { OurPantryTabBar } from "./OurPantryTabBar";
import { TabBarChromeProvider, useTabBarChrome } from "./TabBarChromeContext";

jest.mock("expo-blur", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    BlurView: (props: object) => React.createElement("BlurView", props),
  };
});

jest.mock("expo-glass-effect", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    GlassView: View,
    isGlassEffectAPIAvailable: () => false,
    isLiquidGlassAvailable: () => false,
  };
});

jest.mock("../ui/useReduceTransparency", () => ({
  useReduceTransparency: () => false,
}));

jest.mock("react-native-reanimated", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType) => Component,
    },
    Extrapolation: { CLAMP: "clamp" },
    Easing: { bezier: () => jest.fn() },
    interpolate: (
      value: number,
      input: [number, number],
      output: [number, number],
    ) => {
      const progress = (value - input[0]) / (input[1] - input[0]);
      return output[0] + (output[1] - output[0]) * progress;
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (initialValue: number) => ({
      current: initialValue,
      get() {
        return this.current;
      },
      set(nextValue: number) {
        this.current = nextValue;
      },
    }),
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

function createProps() {
  const routes = [
    { key: "index-key", name: "index", params: undefined },
    { key: "shop-key", name: "shop", params: undefined },
    { key: "pantry-key", name: "pantry", params: undefined },
    { key: "analytics-key", name: "analytics", params: undefined },
  ];
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigate = jest.fn();

  return {
    props: {
      state: {
        index: 1,
        routes,
      },
      descriptors: Object.fromEntries(
        routes.map((route) => [route.key, { options: {} }]),
      ),
      navigation: { emit, navigate },
      insets: { top: 0, right: 0, bottom: 34, left: 0 },
    } as unknown as BottomTabBarProps,
    emit,
    navigate,
  };
}

function DockAccessoryRegistrar() {
  const { setFooterAccessory } = useTabBarChrome();

  React.useEffect(() => {
    setFooterAccessory({
      content: <React.Fragment>Docked composer</React.Fragment>,
      height: 72,
      id: "shop-composer",
    });
    return () => setFooterAccessory(null);
  }, [setFooterAccessory]);

  return null;
}

describe("OurPantryTabBar", () => {
  it("keeps every destination accessible and navigates from a tab press", () => {
    const { props, emit, navigate } = createProps();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TabBarChromeProvider>
          <OurPantryTabBar {...props} />
        </TabBarChromeProvider>,
      );
    });

    const root = renderer!.root as unknown as {
      findAllByProps: (props: Record<string, unknown>) => {
        props: {
          accessibilityLabel: string;
          accessibilityRole: string;
          accessibilityState: { selected: boolean };
          onPress: () => void;
        };
      }[];
    };
    const tabs = ["Plan", "Shop", "Pantry", "Spending"].map(
      (label) =>
        root
          .findAllByProps({ accessibilityLabel: label })
          .find(
            (node) =>
              node.props.accessibilityRole === "tab" &&
              typeof node.props.onPress === "function",
          )!,
    );
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
      "Plan",
      "Shop",
      "Pantry",
      "Spending",
    ]);
    expect(tabs.map((tab) => tab.props.accessibilityState.selected)).toEqual([
      false,
      true,
      false,
      false,
    ]);

    act(() => tabs[0].props.onPress());

    expect(emit).toHaveBeenCalledWith({
      type: "tabPress",
      target: "index-key",
      canPreventDefault: true,
    });
    expect(navigate).toHaveBeenCalledWith("index", undefined);
  });

  it("protects the full footer behind the floating material with blur", () => {
    const { props } = createProps();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TabBarChromeProvider>
          <OurPantryTabBar {...props} />
        </TabBarChromeProvider>,
      );
    });

    const root = renderer!.root as unknown as {
      findAll: (predicate: (node: { type: unknown }) => boolean) => {
        props: { intensity?: number };
      }[];
    };
    const blurLayers = root.findAll(
      (node: { type: unknown }) => node.type === "BlurView",
    );

    // Five progressive layers, one full-footer layer, and the bar material.
    expect(blurLayers).toHaveLength(7);

    const footerMaterial = renderer!.root.findByProps({
      testID: "tab-bar-footer-material",
    });
    expect(footerMaterial.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ bottom: -34 })]),
    );
    expect(blurLayers.some((layer) => layer.props.intensity === 28)).toBe(true);
  });

  it("renders a screen accessory inside the same protected footer dock", () => {
    const { props } = createProps();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <TabBarChromeProvider>
          <DockAccessoryRegistrar />
          <OurPantryTabBar {...props} />
        </TabBarChromeProvider>,
      );
    });

    const dock = renderer!.root.findByProps({
      testID: "tab-bar-footer-dock",
    });
    const accessory = renderer!.root.findByProps({
      testID: "tab-bar-footer-accessory",
    });

    expect(dock.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 158 })]),
    );
    expect(accessory.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bottom: 86, height: 72 }),
      ]),
    );
  });
});
