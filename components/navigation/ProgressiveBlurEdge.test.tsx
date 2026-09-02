import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { ProgressiveBlurEdge } from "./ProgressiveBlurEdge";

jest.mock("expo-blur", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    BlurView: (props: object) => React.createElement("BlurView", props),
  };
});

jest.mock("../ui/useReduceTransparency", () => ({
  useReduceTransparency: () => false,
}));

describe("ProgressiveBlurEdge", () => {
  it("uses a bounded set of low-intensity layers for a feather-only footer", () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ProgressiveBlurEdge
          fadeEdge="top"
          falloff={64}
          includeMaterial={false}
          spill={16}
        />,
      );
    });

    const root = renderer!.root as unknown as {
      findAll: (predicate: (node: { type: unknown }) => boolean) => {
        props: { intensity: number };
      }[];
    };
    const blurLayers = root.findAll(
      (node: { type: unknown }) => node.type === "BlurView",
    );
    expect(blurLayers).toHaveLength(5);
    expect(
      blurLayers.every((layer) => layer.props.intensity <= 8),
    ).toBe(true);
  });
});
