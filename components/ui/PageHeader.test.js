import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text, View } from "react-native";

import { PageHeader } from "./PageHeader";

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

describe("PageHeader", () => {
  it("keeps a trailing action while preserving the shared back affordance", () => {
    const onBack = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <PageHeader
          title="Weekly shop"
          onBack={onBack}
          trailing={<View testID="header-action" />}
        />,
      );
    });

    expect(renderer.root.findByProps({ testID: "header-action" })).toBeTruthy();
    expect(
      renderer.root.findAllByType(Text).some((node) => node.props.children === "Weekly shop"),
    ).toBe(true);

    const back = renderer.root.findByProps({ accessibilityLabel: "Back" });
    act(() => back.props.onPress());
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
