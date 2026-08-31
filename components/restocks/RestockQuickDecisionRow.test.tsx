import React from "react";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";

import { RestockQuickDecisionRow } from "./RestockQuickDecisionRow";

describe("RestockQuickDecisionRow", () => {
  it("exposes the three immediate Plan decisions", () => {
    const onDecision = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <RestockQuickDecisionRow
          cadenceLabel="Usually bought every 7 days"
          displayName="Milk"
          isAdded={false}
          isBusy={false}
          onDecision={onDecision}
        />,
      );
    });

    for (const [label, decision] of [
      ["Add Milk to shop", "add"],
      ["Still have some Milk", "still_have_some"],
      ["Not now for Milk", "not_this_time"],
    ] as const) {
      act(() => {
        const onPress = renderer.root.findByProps({ accessibilityLabel: label })
          .props.onPress as () => void;
        onPress();
      });
      expect(onDecision).toHaveBeenLastCalledWith(decision);
    }
  });

  it("prevents another add when the product is already planned", () => {
    const onDecision = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <RestockQuickDecisionRow
          cadenceLabel="Last bought 5 days ago"
          displayName="Bread"
          isAdded
          isBusy={false}
          onDecision={onDecision}
        />,
      );
    });

    const add = renderer.root.findByProps({
      accessibilityLabel: "Bread already added to shop",
    });
    expect(add.props.disabled).toBe(true);
    expect(onDecision).not.toHaveBeenCalled();
  });
});
