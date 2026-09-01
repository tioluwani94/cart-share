import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";

import { Button } from "./Button";

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return { BlurView: View };
});

jest.mock("expo-glass-effect", () => {
  const { View } = require("react-native");
  return {
    GlassView: View,
    isGlassEffectAPIAvailable: () => false,
    isLiquidGlassAvailable: () => false,
  };
});

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component) => Component,
    },
    Easing: { bezier: () => jest.fn() },
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (initialValue) => ({
      current: initialValue,
      get() {
        return this.current;
      },
      set(nextValue) {
        this.current = nextValue;
      },
    }),
    withSpring: (value) => value,
    withTiming: (value) => value,
  };
});

jest.mock("./GlassSurfaceContext", () => ({
  useIsOnGlassSurface: () => false,
}));

jest.mock("./useReduceTransparency", () => ({
  useReduceTransparency: () => false,
}));

describe("Button", () => {
  it("uses the welcome CTA font for standard text labels", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(<Button>Continue</Button>);
    });

    const label = renderer.root
      .findAllByType(Text)
      .find((node) => node.props.children === "Continue");

    expect(label).toBeDefined();
    expect(StyleSheet.flatten(label.props.style)).toEqual(
      expect.objectContaining({ fontFamily: "Nunito_800ExtraBold" }),
    );
  });
});
