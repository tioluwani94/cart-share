/* eslint-env jest */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { MonthlyBudgetPrompt } from "./MonthlyBudgetPrompt";

jest.mock("@/components/ui/Button", () => ({ Button: "mock-button" }));

it("offers budget setup only when the household has no budget", () => {
  const setup = jest.fn();
  let renderer;
  act(() => {
    renderer = TestRenderer.create(<MonthlyBudgetPrompt onSetup={setup} />);
  });
  act(() => renderer.root.findByType("mock-button").props.onPress());
  expect(setup).toHaveBeenCalledTimes(1);
  for (const budget of [0, 40000]) {
    act(() =>
      renderer.update(
        <MonthlyBudgetPrompt monthlyBudgetPence={budget} onSetup={setup} />,
      ),
    );
    expect(renderer.toJSON()).toBeNull();
  }
  act(() => renderer.update(<MonthlyBudgetPrompt onSetup={setup} />));
  expect(renderer.root.findAllByType("mock-button")).toHaveLength(1);
  act(() => renderer.unmount());
});
