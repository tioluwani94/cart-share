import React, { createRef } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { StyleSheet, Text, TextInput } from "react-native";

import { AmountInput } from "./AmountInput";

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => jest.fn() },
    interpolate: (_value, _input, output) => output[0],
    interpolateColor: (_value, _input, output) => output[0],
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

describe("AmountInput", () => {
  it("formats controlled values and user edits with a visible currency prefix", () => {
    const onChangeText = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <AmountInput
          label="Budget in pounds"
          value="1234.5"
          onChangeText={onChangeText}
          placeholder="0.00"
        />,
      );
    });

    const input = renderer.root.findByType(TextInput);
    const prefix = renderer.root
      .findAllByType(Text)
      .find((node) => node.props.children === "£");

    expect(prefix).toBeDefined();
    expect(input.props.value).toBe("1,234.5");
    expect(input.props.keyboardType).toBe("decimal-pad");

    act(() => input.props.onChangeText("12345.67"));
    expect(onChangeText).toHaveBeenCalledWith("12,345.67");
  });

  it("supports a prominent total-entry treatment through the same API", () => {
    const ref = createRef();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <AmountInput
          ref={ref}
          label="Shop total"
          value=""
          onChangeText={jest.fn()}
          presentation="prominent"
        />,
      );
    });

    const input = renderer.root.findByType(TextInput);
    const style = StyleSheet.flatten(input.props.style);

    expect(style).toEqual(
      expect.objectContaining({ minHeight: 80, fontSize: 30, lineHeight: 36 }),
    );
    expect(ref.current).toBe(input.instance);
  });

  it("keeps error messaging and accessibility in the shared field", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <AmountInput
          label="Estimated price"
          value=""
          onChangeText={jest.fn()}
          error="Enter a valid amount"
        />,
      );
    });

    const input = renderer.root.findByType(TextInput);

    expect(input.props["aria-invalid"]).toBe(true);
    expect(input.props.accessibilityHint).toBe("Enter a valid amount");
  });
});
