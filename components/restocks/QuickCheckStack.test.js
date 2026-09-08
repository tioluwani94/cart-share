/* eslint-env jest */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { View } from "react-native";
import { QuickCheckStack } from "./QuickCheckStack";

it.each([1, 2, 3, 4])(
  "shows the right depth for %s remaining products, independent of card height",
  (remaining) => {
    let tree;
    for (const height of [340, 520, 720]) {
      act(() => {
        tree = TestRenderer.create(
          <QuickCheckStack remaining={remaining}>
            <View style={{ height }} />
          </QuickCheckStack>,
        );
      });
      const layers = tree.root
        .findAllByType(View)
        .filter((node) =>
          node.props.testID?.startsWith("quick-check-stack-layer-"),
        );
      expect(layers).toHaveLength(Math.min(2, remaining - 1));
      expect(
        tree.root.findByProps({ testID: "quick-check-stack" }).props.style
          .paddingTop,
      ).toBe(layers.length * 10);
      for (const layer of layers) {
        expect(layer.props.style.top).toBeLessThan(0);
        expect(layer.props.style.bottom).toBe(-layer.props.style.top);
        expect(layer.props.style.transform).toBeUndefined();
        expect(layer.props.pointerEvents).toBe("none");
        expect(layer.props.accessibilityElementsHidden).toBe(true);
      }
      act(() => tree.unmount());
    }
  },
);
