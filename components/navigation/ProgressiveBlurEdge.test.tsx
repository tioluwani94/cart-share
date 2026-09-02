import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
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
      findAll: (
        predicate: (node: {
          type: unknown;
          props?: { testID?: string };
        }) => boolean,
      ) => {
        props: { intensity: number; style?: StyleProp<ViewStyle> };
      }[];
    };
    const blurLayers = root.findAll(
      (node: { type: unknown }) => node.type === "BlurView",
    );
    expect(blurLayers).toHaveLength(5);
    expect(
      blurLayers.every((layer) => layer.props.intensity <= 8),
    ).toBe(true);

    const featherLayers = root.findAll(
      (node: { props?: { testID?: string } }) =>
        Boolean(
          node.props?.testID?.startsWith("progressive-blur-feather-layer-"),
        ),
    );
    const bounds = featherLayers.map((layer) =>
      StyleSheet.flatten(layer.props.style),
    );
    expect(new Set(bounds.map((style) => style.top)).size).toBeGreaterThan(1);
    expect(new Set(bounds.map((style) => style.bottom)).size).toBeGreaterThan(1);
  });

  it("forwards a dark material tint to every blur layer", () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ProgressiveBlurEdge
          fadeEdge="bottom"
          tint="systemUltraThinMaterialDark"
        />,
      );
    });

    const root = renderer!.root as unknown as {
      findAll: (predicate: (node: { type: unknown }) => boolean) => {
        props: { intensity: number; tint: string };
      }[];
    };
    const blurLayers = root.findAll(
      (node: { type: unknown }) => node.type === "BlurView",
    );
    expect(blurLayers).toHaveLength(6);
    expect(
      blurLayers.every(
        (layer) => layer.props.tint === "systemUltraThinMaterialDark",
      ),
    ).toBe(true);
    expect(
      blurLayers.slice(0, 5).every((layer) => layer.props.intensity <= 8),
    ).toBe(true);
    expect(blurLayers[5].props.intensity).toBe(30);
  });
});
