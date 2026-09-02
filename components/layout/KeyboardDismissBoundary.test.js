import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Text, View } from "react-native";

import { KeyboardDismissBoundary } from "./KeyboardDismissBoundary";

const mockDismissKeyboardForOutsideTouch = jest.fn();

jest.mock("@/lib/keyboard", () => ({
  dismissKeyboardForOutsideTouch: (...args) =>
    mockDismissKeyboardForOutsideTouch(...args),
}));

describe("KeyboardDismissBoundary", () => {
  beforeEach(() => {
    mockDismissKeyboardForOutsideTouch.mockClear();
  });

  it("observes every touch without claiming the responder", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <KeyboardDismissBoundary>
          <Text>Screen content</Text>
        </KeyboardDismissBoundary>,
      );
    });

    const boundary = renderer.root.findAllByType(View)[0];
    const event = { nativeEvent: { target: 42 } };
    act(() => boundary.props.onStartShouldSetResponderCapture(event));

    expect(mockDismissKeyboardForOutsideTouch).toHaveBeenCalledWith(event);
  });
});
