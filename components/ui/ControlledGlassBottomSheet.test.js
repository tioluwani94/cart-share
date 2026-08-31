import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ControlledGlassBottomSheet } from "./ControlledGlassBottomSheet";

const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock("./GlassBottomSheet", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    GlassBottomSheet: React.forwardRef(({ children, onDismiss }, ref) => {
      React.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
      }));
      return (
        <View testID="controlled-sheet" onDismiss={onDismiss}>
          {children}
        </View>
      );
    }),
  };
});

describe("ControlledGlassBottomSheet", () => {
  beforeEach(() => {
    mockPresent.mockClear();
    mockDismiss.mockClear();
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

  it("presents and dismisses in response to visible state", () => {
    const onClose = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <ControlledGlassBottomSheet visible={false} onClose={onClose}>
          <></>
        </ControlledGlassBottomSheet>,
      );
    });

    act(() => {
      renderer.update(
        <ControlledGlassBottomSheet visible onClose={onClose}>
          <></>
        </ControlledGlassBottomSheet>,
      );
    });

    expect(mockPresent).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.update(
        <ControlledGlassBottomSheet visible={false} onClose={onClose}>
          <></>
        </ControlledGlassBottomSheet>,
      );
    });

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it("reports a gesture or backdrop dismissal through onClose", () => {
    const onClose = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <ControlledGlassBottomSheet visible onClose={onClose}>
          <></>
        </ControlledGlassBottomSheet>,
      );
    });

    const sheet = renderer.root.findByProps({ testID: "controlled-sheet" });

    act(() => sheet.props.onDismiss());

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
