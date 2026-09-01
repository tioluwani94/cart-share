import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { StyleSheet, Text, View } from "react-native";

import { GlassSheetHeader } from "./GlassSheetHeader";

jest.mock("./Button", () => {
  const { Pressable } = require("react-native");
  return {
    Button: ({ children, onPress, ...props }) => (
      <Pressable onPress={onPress} {...props}>
        {children}
      </Pressable>
    ),
  };
});

describe("GlassSheetHeader", () => {
  it("keeps the title, context, and close action in one quiet hierarchy", () => {
    const onClose = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <GlassSheetHeader
          title="New shopping list"
          description="Name the shop, then add optional details."
          icon={<View testID="sheet-icon" />}
          onClose={onClose}
          closeAccessibilityLabel="Close new shopping list"
        />,
      );
    });

    const title = renderer.root
      .findAllByType(Text)
      .find((node) => node.props.children === "New shopping list");
    const close = renderer.root.findByProps({
      accessibilityLabel: "Close new shopping list",
    });

    expect(renderer.root.findByProps({ testID: "sheet-icon" })).toBeTruthy();
    expect(StyleSheet.flatten(title.props.style)).toEqual(
      expect.objectContaining({ fontFamily: "Nunito_900Black" }),
    );
    expect(close.props.accessibilityHint).toBe("Dismisses this sheet");

    act(() => close.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
