import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { usePantryScrollReset } from "./usePantryScrollReset";

it("resets to the absolute top before and after a filter layout, not on live updates", () => {
  const scrollToOffset = jest.fn();
  const ref = { current: { scrollToOffset } };
  let actions!: ReturnType<typeof usePantryScrollReset>;
  let tree!: ReactTestRenderer;
  function Harness() {
    actions = usePantryScrollReset(ref);
    return null;
  }
  act(() => {
    tree = TestRenderer.create(<Harness />);
  });
  act(() => actions.onCommitLayoutEffect());
  expect(scrollToOffset).not.toHaveBeenCalled();
  act(() => actions.resetScroll());
  act(() => actions.onCommitLayoutEffect());
  expect(scrollToOffset).toHaveBeenCalledTimes(2);
  expect(scrollToOffset).toHaveBeenLastCalledWith({
    offset: 0,
    animated: false,
    skipFirstItemOffset: true,
  });
  act(() => actions.onCommitLayoutEffect());
  expect(scrollToOffset).toHaveBeenCalledTimes(2);
  act(() => actions.resetScroll());
  expect(scrollToOffset).toHaveBeenCalledTimes(3);
  act(() => tree.unmount());
});
