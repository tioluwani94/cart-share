import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { GlassSegmentedControl } from "./GlassSegmentedControl";

const mockSelectionAsync = jest.fn();

jest.mock("expo-haptics", () => ({
  selectionAsync: (...args) => mockSelectionAsync(...args),
}));

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
    default: { View },
    Easing: { bezier: () => jest.fn() },
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (initialValue) => ({
      current: initialValue,
      get() {
        return this.current;
      },
      set(nextValue) {
        this.current = nextValue;
      },
    }),
    withTiming: (value) => value,
  };
});

const options = [
  { label: "In store", value: "in_store" },
  { label: "Online", value: "online" },
];

describe("GlassSegmentedControl", () => {
  beforeEach(() => {
    mockSelectionAsync.mockClear();
  });

  it("exposes the selected segment and announces a changed selection", () => {
    const onValueChange = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <GlassSegmentedControl
          value="in_store"
          options={options}
          onValueChange={onValueChange}
          accessibilityLabel="Shopping method"
        />,
      );
    });

    const inStore = renderer.root.findByProps({
      accessibilityLabel: "In store",
    });
    const online = renderer.root.findByProps({ accessibilityLabel: "Online" });

    expect(inStore.props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
    expect(online.props.accessibilityState).toEqual({
      disabled: false,
      selected: false,
    });

    act(() => online.props.onPress());

    expect(onValueChange).toHaveBeenCalledWith("online");
    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
  });

  it("does not fire a haptic or callback for the already-selected segment", () => {
    const onValueChange = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <GlassSegmentedControl
          value="online"
          options={options}
          onValueChange={onValueChange}
        />,
      );
    });

    const online = renderer.root.findByProps({ accessibilityLabel: "Online" });
    act(() => online.props.onPress());

    expect(onValueChange).not.toHaveBeenCalled();
    expect(mockSelectionAsync).not.toHaveBeenCalled();
  });
});
