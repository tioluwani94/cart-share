/* eslint-env jest */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Keyboard, StyleSheet, Text, TextInput } from "react-native";

import { themeColors } from "@/lib/theme";
import { Input } from "./Input";

jest.mock("react-native-reanimated", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires -- Jest factory is hoisted.
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

describe("Input", () => {
  it("toggles a password in place without changing its value or dismissing the keyboard", () => {
    let renderer;
    const onChangeText = jest.fn();
    const dismiss = jest.spyOn(Keyboard, "dismiss");
    act(() => {
      renderer = TestRenderer.create(
        <Input label="Password" secureTextEntry passwordToggle
          value="sample-password" onChangeText={onChangeText} />,
      );
    });
    const input = renderer.root.findByType(TextInput);
    const toggle = () => renderer.root.findAll((node) =>
      node.props.accessibilityRole === "button" && typeof node.props.onPress === "function",
    )[0];
    expect(input.props.secureTextEntry).toBe(true);
    expect(toggle().props.accessibilityLabel).toBe("Show password");
    expect(toggle().props.className).toContain("min-h-11 min-w-11");
    act(() => toggle().props.onPress());
    expect(renderer.root.findByType(TextInput)).toBe(input);
    expect(input.props.secureTextEntry).toBe(false);
    expect(input.props.value).toBe("sample-password");
    expect(toggle().props.accessibilityLabel).toBe("Hide password");
    expect(onChangeText).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    act(() => toggle().props.onPress());
    expect(input.props.secureTextEntry).toBe(true);
    act(() => toggle().props.onPress());
    act(() => input.props.onBlur({ nativeEvent: {} }));
    expect(input.props.secureTextEntry).toBe(true);
    act(() => renderer.unmount());
    dismiss.mockRestore();
  });

  it("disables password visibility while the field is disabled", () => {
    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <Input label="Password" secureTextEntry passwordToggle editable={false} />,
      );
    });
    const toggle = renderer.root.findByProps({ accessibilityLabel: "Show password" });
    expect(toggle.props.disabled).toBe(true);
    expect(toggle.props.accessibilityState).toEqual({ disabled: true });
    act(() => renderer.unmount());
  });

  it("does not add visibility controls to ordinary or non-opted-in fields", () => {
    let renderer;
    act(() => {
      renderer = TestRenderer.create(<Input label="Name" passwordToggle />);
    });
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Show password" })).toHaveLength(0);
    act(() => renderer.update(<Input label="Password" secureTextEntry />));
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Show password" })).toHaveLength(0);
    expect(renderer.root.findByType(TextInput).props.secureTextEntry).toBe(true);
    act(() => renderer.unmount());
  });

  it("renders a trailing control beside a flexible input without requiring a leading icon", () => {
    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <Input label="Search" trailingAccessory={<Text>Clear</Text>} />,
      );
    });
    expect(renderer.root.findByType(TextInput).props.className).toContain(
      "flex-1",
    );
    expect(
      renderer.root
        .findAllByType(Text)
        .some((node) => node.props.children === "Clear"),
    ).toBe(true);
    act(() => renderer.unmount());
  });

  it("uses a comfortable iOS field size and keeps placeholder hierarchy clear", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <Input label="Household name" placeholder="e.g. The Smiths" />,
      );
    });

    const input = renderer.root.findByType(TextInput);
    const style = StyleSheet.flatten(input.props.style);

    expect(style).toEqual(
      expect.objectContaining({ minHeight: 56, fontSize: 17, lineHeight: 22 }),
    );
    expect(input.props.placeholderTextColor).toBe(themeColors.muted);
    expect(input.props.selectionColor).toBe(themeColors.coral);
    expect(input.props.accessibilityLabel).toBe("Household name");
    expect(input.props.returnKeyType).toBe("done");
    expect(input.props.submitBehavior).toBe("blurAndSubmit");
  });

  it("keeps Return available for multiline notes while single-line fields dismiss", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <Input label="Notes" multiline numberOfLines={3} />,
      );
    });

    const input = renderer.root.findByType(TextInput);

    expect(input.props.returnKeyType).toBe("default");
    expect(input.props.submitBehavior).toBe("newline");
  });

  it("exposes errors inline and to assistive technology", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <Input label="Budget in pounds" error="Enter a valid amount" />,
      );
    });

    const input = renderer.root.findByType(TextInput);
    const error = renderer.root
      .findAllByType(Text)
      .find((node) => node.props.children === "Enter a valid amount");

    expect(input.props["aria-invalid"]).toBe(true);
    expect(input.props.accessibilityHint).toBe("Enter a valid amount");
    expect(error.props.accessibilityRole).toBe("alert");
    expect(error.props.accessibilityLiveRegion).toBe("polite");
  });

  it("communicates its disabled state and preserves focus callbacks", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <Input
          label="List name"
          editable={false}
          onFocus={onFocus}
          onBlur={onBlur}
        />,
      );
    });

    const input = renderer.root.findByType(TextInput);

    expect(input.props.accessibilityState).toEqual({ disabled: true });

    act(() => input.props.onFocus({ nativeEvent: {} }));
    act(() => input.props.onBlur({ nativeEvent: {} }));

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
