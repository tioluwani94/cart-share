/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-var-requires -- Jest mock factories are hoisted. */
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { PantryProductTile } from "./PantryShelf";
import { useReducedMotion } from "react-native-reanimated";

jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("@shopify/flash-list", () => ({ FlashList: "FlashList" }));
jest.mock("@/lib/pantryArtwork", () => ({
  pantryArtwork: { bread: { source: 1, size: 116, bottom: -14 } },
}));
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (Component) => Component },
    Easing: { bezier: () => () => 0 },
    cubicBezier: () => "ease-out",
    useReducedMotion: jest.fn(() => false),
    useSharedValue: (value) => ({ get: () => value, set: jest.fn() }),
    useAnimatedStyle: (factory) => factory(),
    withTiming: jest.fn((value) => value),
  };
});

describe("Pantry product press", () => {
  afterEach(() => jest.clearAllMocks());
  it.each([false, true])(
    "opens the same household record with reduced motion %s",
    (reduced) => {
      useReducedMotion.mockReturnValue(reduced);
      const product = {
        _id: "household-bread",
        displayName: "Bread",
        status: "active",
        cadenceDays: 7,
      };
      const openEditor = jest.fn();
      let renderer;
      act(() => {
        renderer = TestRenderer.create(
          <PantryProductTile
            product={product}
            width={152}
            onPress={openEditor}
          />,
        );
      });
      const tile = renderer.root.findByProps({ accessibilityRole: "button" });
      act(() => tile.props.onPressIn());
      act(() => tile.props.onPress());
      act(() => tile.props.onPressOut());
      expect(openEditor).toHaveBeenCalledTimes(1);
      expect(openEditor).toHaveBeenCalledWith(product);
      expect(tile.props.style.transitionDuration).toBe("120ms");
      expect(tile.props.style.transform).toEqual([{ scale: 1 }]);
      act(() => renderer.unmount());
    },
  );
});
