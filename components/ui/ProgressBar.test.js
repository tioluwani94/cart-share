import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { StyleSheet, View } from "react-native";

import { ProgressBar } from "./ProgressBar";

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: { View },
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
    withTiming: (value) => value,
  };
});

describe("ProgressBar", () => {
  it.each([
    ["regular", 20],
    ["compact", 8],
  ])("renders the %s treatment at %d points high", (size, height) => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <ProgressBar
          value={1}
          max={4}
          size={size}
          accessibilityLabel="Setup progress"
          accessibilityText="Step 1 of 4"
        />,
      );
    });

    const progressBar = renderer.root
      .findAllByType(View)
      .find((node) => node.props.accessibilityLabel === "Setup progress");

    expect(progressBar).toBeDefined();
    expect(StyleSheet.flatten(progressBar.props.style)).toEqual(
      expect.objectContaining({ height }),
    );
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 4,
      now: 1,
      text: "Step 1 of 4",
    });
  });

  it("clamps invalid values before exposing progress to assistive technology", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <ProgressBar
          value={8}
          max={4}
          min={1}
          accessibilityLabel="Setup progress"
        />,
      );
    });

    const progressBar = renderer.root
      .findAllByType(View)
      .find((node) => node.props.accessibilityLabel === "Setup progress");

    expect(progressBar.props.accessibilityValue).toEqual({
      min: 1,
      max: 4,
      now: 4,
    });
  });
});
