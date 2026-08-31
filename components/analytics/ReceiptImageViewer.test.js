import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ReceiptImageViewer } from "./ReceiptImageViewer";

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
        <View testID="receipt-viewer-sheet" onDismiss={onDismiss}>
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
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return {
    X: Icon,
    ZoomIn: Icon,
    ZoomOut: Icon,
    Receipt: Icon,
  };
});

describe("ReceiptImageViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    jest.spyOn(global, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("presents as a sheet and closes only after the sheet dismisses", () => {
    const onClose = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <ReceiptImageViewer
          visible
          imageUrl={null}
          onClose={onClose}
        />,
      );
    });

    expect(mockPresent).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.root.findByProps({
        accessibilityLabel: "Close receipt viewer",
      }).props.onPress();
    });

    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      renderer.root.findByProps({ testID: "receipt-viewer-sheet" }).props.onDismiss();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
