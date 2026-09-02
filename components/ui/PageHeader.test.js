import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text, View } from "react-native";

import { PageHeader } from "./PageHeader";

jest.mock("expo-status-bar", () => {
  const { View } = require("react-native");
  return {
    StatusBar: (props) => <View testID="page-header-status-bar" {...props} />,
  };
});

jest.mock("@/components/navigation/ProgressiveBlurEdge", () => {
  const { View } = require("react-native");
  return {
    ProgressiveBlurEdge: (props) => (
      <View testID="page-header-progressive-blur" {...props} />
    ),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

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

    const blur = renderer.root.findByProps({
      testID: "page-header-progressive-blur",
    });
    expect(blur.props.fadeEdge).toBe("bottom");
    expect(blur.props.tint).toBe("systemUltraThinMaterialLight");
    expect(blur.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ top: -47 })]),
    );
    expect(
      renderer.root.findByProps({ testID: "page-header-status-bar" }).props
        .style,
    ).toBe("dark");
  });

  it("uses a dark progressive material over camera content", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <PageHeader
          title="Review photo"
          appearance="overlay"
          onBack={jest.fn()}
        />,
      );
    });

    expect(
      renderer.root.findByProps({ testID: "page-header-progressive-blur" })
        .props.tint,
    ).toBe("systemUltraThinMaterialDark");
    expect(
      renderer.root.findByProps({ testID: "page-header-status-bar" }).props
        .style,
    ).toBe("light");
  });
});
