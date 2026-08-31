import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { UserAvatar } from "./UserAvatar";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock("./GlassBottomSheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassBottomSheet: React.forwardRef(({ children }, ref) => {
      React.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
      }));
      return <View testID="avatar-info-sheet">{children}</View>;
    }),
    GlassBottomSheetView: View,
  };
});

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
  beforeEach(() => {
    mockPresent.mockClear();
    mockDismiss.mockClear();
  });

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

  it("presents profile details in the shared bottom sheet on long press", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(<UserAvatar name="Tiolu" />);
    });

    const avatar = renderer.root
      .findAllByProps({ accessibilityLabel: "Added by Tiolu" })
      .find((node) => typeof node.props.onLongPress === "function");

    act(() => avatar.props.onLongPress());

    expect(mockPresent).toHaveBeenCalledTimes(1);

    const closeButton = renderer.root.findByProps({
      accessibilityLabel: "Close profile details",
    });

    act(() => closeButton.props.onPress());

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});
