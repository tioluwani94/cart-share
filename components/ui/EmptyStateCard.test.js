/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-var-requires -- Jest mock factories are hoisted. */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { StyleSheet, Text, View } from "react-native";

import { EmptyStateCard } from "./EmptyStateCard";

jest.mock("expo-image", () => {
  const { View } = require("react-native");
  return {
    Image: (props) => <View testID="empty-state-artwork" {...props} />,
  };
});

jest.mock("./Button", () => ({
  Button: ({ children, onPress, ...props }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable onPress={onPress} {...props}>
        <Text>{children}</Text>
      </Pressable>
    );
  },
}));

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const builder = {
    duration: () => builder,
    easing: () => builder,
  };

  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => jest.fn() },
    FadeIn: builder,
    useReducedMotion: () => false,
  };
});

describe("EmptyStateCard", () => {
  it("uses an opaque content surface and exposes one clear action", () => {
    const onAction = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <EmptyStateCard
          title="Your spending starts here"
          description="Finish a shop to unlock household spending insights."
          artworkSource={1}
          actionLabel="Plan a shop"
          onAction={onAction}
        />,
      );
    });

    const root = renderer.root.findByProps({ testID: "empty-state-card" });
    expect(root.props.className).toContain("bg-surface");
    expect(root.props.className).not.toContain("glass");
    expect(StyleSheet.flatten(root.props.style)?.backgroundColor).toBe(
      "#FFFFFF",
    );

    const artwork = renderer.root.findByProps({
      testID: "empty-state-artwork",
    });
    expect(artwork.props.accessible).toBe(false);

    const heading = renderer.root
      .findAllByType(Text)
      .find((node) => node.props.children === "Your spending starts here");
    expect(heading.props.accessibilityRole).toBe("header");

    const action = renderer.root.findByProps({
      accessibilityLabel: "Plan a shop",
    });
    act(() => action.props.onPress());
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("supports an embedded treatment without nesting another card", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <EmptyStateCard
          title="No trips yet"
          description="Finished shops will appear here."
          icon={<View testID="fallback-icon" />}
          variant="embedded"
          density="compact"
        />,
      );
    });

    const root = renderer.root.findByProps({ testID: "empty-state-card" });
    expect(root.props.className).not.toContain("bg-surface");
    expect(
      StyleSheet.flatten(root.props.style)?.backgroundColor,
    ).toBeUndefined();
    expect(renderer.root.findByProps({ testID: "fallback-icon" })).toBeTruthy();
  });
});
