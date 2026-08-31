import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { GlassSegmentedControl } from "./GlassSegmentedControl";

const mockSelectionAsync = jest.fn();
const mockWithTiming = jest.fn((value) => value);

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
    default: {
      View,
      createAnimatedComponent: (Component) => Component,
    },
    cubicBezier: () => jest.fn(),
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
    withTiming: (...args) => mockWithTiming(...args),
  };
});

const options = [
  { label: "In store", value: "in_store" },
  { label: "Online", value: "online" },
];

function findSegment(renderer, accessibilityLabel) {
  return renderer.root
    .findAllByProps({ accessibilityLabel })
    .find((node) => node.props.accessibilityRole === "radio");
}

describe("GlassSegmentedControl", () => {
  beforeEach(() => {
    mockSelectionAsync.mockClear();
    mockWithTiming.mockClear();
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

    const inStore = findSegment(renderer, "In store");
    const online = findSegment(renderer, "Online");

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

    const online = findSegment(renderer, "Online");
    act(() => online.props.onPress());

    expect(onValueChange).not.toHaveBeenCalled();
    expect(mockSelectionAsync).not.toHaveBeenCalled();
  });

  it("provides immediate press feedback before committing the selection", () => {
    const onValueChange = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <GlassSegmentedControl
          value="in_store"
          options={options}
          onValueChange={onValueChange}
        />,
      );
    });

    const online = findSegment(renderer, "Online");

    expect(online.props.onPressIn).toEqual(expect.any(Function));
    expect(online.props.onPressOut).toEqual(expect.any(Function));

    act(() => online.props.onPressIn());
    expect(onValueChange).not.toHaveBeenCalled();

    act(() => online.props.onPressOut());
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("moves the selection pill with the shared ease-in-out timing", () => {
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

    const control = renderer.root
      .findAllByProps({ accessibilityLabel: "Shopping method" })
      .find((node) => typeof node.props.onLayout === "function");
    act(() =>
      control.props.onLayout({
        nativeEvent: { layout: { width: 200 } },
      }),
    );

    mockWithTiming.mockClear();
    act(() => {
      renderer.update(
        <GlassSegmentedControl
          value="online"
          options={options}
          onValueChange={onValueChange}
          accessibilityLabel="Shopping method"
        />,
      );
    });

    expect(mockWithTiming).toHaveBeenCalledWith(96, {
      duration: 180,
      easing: expect.any(Function),
    });
  });
});
