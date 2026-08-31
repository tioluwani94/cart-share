import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { UserAvatar } from "./UserAvatar";

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const transition = { duration: () => transition };

  return {
    __esModule: true,
    default: { View },
    FadeIn: transition,
    FadeOut: transition,
    useAnimatedStyle: (factory) => factory(),
    useSharedValue: (value) => ({ value }),
    withSpring: (value) => value,
  };
});

describe("UserAvatar", () => {
  it("runs its public press action when used as a navigation control", () => {
    const onPress = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <UserAvatar
          name="Tiolu"
          onPress={onPress}
          accessibilityLabel="Open settings"
        />,
      );
    });

    const avatar = renderer.root
      .findAllByProps({ accessibilityLabel: "Open settings" })
      .find((node) => typeof node.props.onPress === "function");

    expect(avatar).toBeDefined();

    act(() => avatar.props.onPress());

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(avatar.props.accessibilityLabel).toBe("Open settings");
  });
});
