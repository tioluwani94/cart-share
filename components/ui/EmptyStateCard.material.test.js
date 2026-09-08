/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-var-requires -- Jest mock factories are hoisted. */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { EmptyStateCard } from "./EmptyStateCard";

jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("expo-blur", () => ({ BlurView: "BlurView" }));
jest.mock("expo-glass-effect", () => ({
  GlassView: "GlassView",
  isGlassEffectAPIAvailable: () => true,
  isLiquidGlassAvailable: () => true,
}));
jest.mock("./useReduceTransparency", () => ({
  useReduceTransparency: () => false,
}));
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const enter = { duration: () => enter, easing: () => enter };
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (Component) => Component },
    Easing: { bezier: () => () => 0 },
    FadeIn: enter,
    useReducedMotion: () => false,
    useSharedValue: (value) => ({ get: () => value, set: jest.fn() }),
    useAnimatedStyle: (factory) => factory(),
    withTiming: (value) => value,
    withSpring: (value) => value,
  };
});

it("restores a solid, labelled action after empty → populated → empty transitions", () => {
  // Native compositing is verified on-device. This locks down the material
  // boundary that prevents a disappearing glass action in a recycled list.
  const showAll = jest.fn();
  const empty = (
    <EmptyStateCard
      title="No products here"
      description="Try another filter."
      actionLabel="Show all shelves"
      onAction={showAll}
    />
  );
  let tree;
  act(() => {
    tree = TestRenderer.create(empty);
  });
  for (let cycle = 0; cycle < 3; cycle++) {
    const button = tree.root.findAllByProps({ accessibilityRole: "button" })[0];
    expect(button.props.accessibilityLabel).toBe("Show all shelves");
    expect(button.props.className).toContain("bg-coral");
    expect(tree.root.findAllByType("GlassView")).toHaveLength(0);
    act(() => button.props.onPress());
    act(() => tree.update(<React.Fragment>Populated shelves</React.Fragment>));
    act(() => tree.update(empty));
  }
  expect(showAll).toHaveBeenCalledTimes(3);
  act(() => tree.unmount());
});
