import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { HeaderMenu } from "./HeaderMenu";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassBottomSheet: React.forwardRef(({ children, onDismiss }, ref) => {
      React.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
      }));
      return (
        <View testID="list-options-sheet" onDismiss={onDismiss}>
          {children}
        </View>
      );
    }),
    GlassBottomSheetView: View,
  };
});

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (factory) => factory(),
    useSharedValue: (value) => ({ value }),
    withSpring: (value) => value,
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return { Archive: Icon, MoreHorizontal: Icon };
});

describe("HeaderMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("dismisses its options sheet before requesting archive confirmation", () => {
    const onArchive = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(<HeaderMenu onArchive={onArchive} />);
    });

    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "More options" }).props.onPress();
    });
    expect(mockPresent).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.root.findByProps({ accessibilityLabel: "Archive list" }).props.onPress();
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(onArchive).not.toHaveBeenCalled();

    act(() => {
      renderer.root.findByProps({ testID: "list-options-sheet" }).props.onDismiss();
    });
    expect(onArchive).toHaveBeenCalledTimes(1);
  });
});
