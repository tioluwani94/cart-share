/* eslint-env jest */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Keyboard } from "react-native";
import { PantrySearchInput } from "./PantrySearchInput";

const mockNativeClear = jest.fn();
jest.mock("@/components/ui/Input", () => {
  const React = jest.requireActual("react");
  return {
    Input: React.forwardRef(function MockInput(props, ref) {
      React.useImperativeHandle(ref, () => ({ clear: mockNativeClear }));
      return <mock-input {...props}>{props.trailingAccessory}</mock-input>;
    }),
  };
});
jest.mock("@/components/ui/Button", () => ({ Button: "mock-button" }));

describe("Pantry search clear control", () => {
  it("appears for any nonempty value without requiring focus and clears in one tap", () => {
    const dismiss = jest
      .spyOn(Keyboard, "dismiss")
      .mockImplementation(() => {});
    const onClear = jest.fn();
    let renderer;
    function SearchHarness() {
      const [, setValue] = React.useState("");
      return <PantrySearchInput onChangeText={setValue} onClear={onClear} />;
    }
    act(() => {
      renderer = TestRenderer.create(<SearchHarness />);
    });
    const input = () => renderer.root.findByType("mock-input");
    act(() => input().props.onChangeText("Bread"));
    const slot = input().props.trailingAccessory.props.className;
    expect(input().props.clearButtonMode).toBe("never");
    const button = renderer.root.findByType("mock-button");
    expect(button.props).toEqual(
      expect.objectContaining({
        accessibilityLabel: "Clear pantry search",
        iconOnly: true,
        forceSolid: true,
      }),
    );
    act(() => button.props.onPress());
    expect(input().props.value).toBeUndefined();
    expect(mockNativeClear).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType("mock-button")).toHaveLength(0);
    expect(input().props.trailingAccessory.props.className).toBe(slot);
    act(() => input().props.onChangeText("   "));
    expect(renderer.root.findAllByType("mock-button")).toHaveLength(1);
    act(() => renderer.unmount());
    dismiss.mockRestore();
  });

  it("does not echo rapid typing, mid-text edits or result rerenders into native text/selection", () => {
    const change = jest.fn();
    const clear = jest.fn();
    const ref = React.createRef();
    let renderer;
    act(() => {
      renderer = TestRenderer.create(
        <PantrySearchInput ref={ref} onChangeText={change} onClear={clear} />,
      );
    });
    const input = () => renderer.root.findByType("mock-input");
    const values = ["b", "br", "bread", "brown bread", "brown read", "   ", ""];
    for (const value of values) {
      act(() => input().props.onChangeText(value));
      act(() =>
        renderer.update(
          <PantrySearchInput ref={ref} onChangeText={change} onClear={clear} />,
        ),
      );
      expect(input().props.value).toBeUndefined();
      expect(input().props.selection).toBeUndefined();
      expect(input().props.defaultValue).toBe("");
    }
    expect(change.mock.calls.map(([value]) => value)).toEqual(values);
    act(() => input().props.onChangeText("Milk"));
    act(() => ref.current.clear());
    expect(change).toHaveBeenLastCalledWith("");
    expect(clear).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType("mock-button")).toHaveLength(0);
    act(() => renderer.unmount());
  });
});
