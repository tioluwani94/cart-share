import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { OurPantryWelcome } from "./OurPantryWelcome";

const mockReducedMotion = { current: false };

jest.mock("expo-image", () => {
  const { View } = require("react-native");
  return { Image: View };
});

jest.mock("expo-status-bar", () => {
  const { View } = require("react-native");
  return { StatusBar: View };
});

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    Easing: { bezier: jest.fn(() => (value) => value) },
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => mockReducedMotion.current,
    useSharedValue: (initialValue) => {
      const value = React.useRef(initialValue);
      return React.useMemo(
        () => ({
          get: () => value.current,
          set: (nextValue) => {
            value.current = nextValue;
          },
        }),
        [value],
      );
    },
    withDelay: (_delay, value) => value,
    withSpring: (value) => value,
    withTiming: (value) => value,
  };
});

describe("OurPantryWelcome", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion.current = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the final state immediately without autoplay and emits semantic actions", () => {
    const onActionPress = jest.fn();
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <OurPantryWelcome autoplay={false} onActionPress={onActionPress} />,
      );
    });

    const google = renderer.root
      .findAllByProps({ accessibilityLabel: "Continue with Google" })
      .find((node) => typeof node.props.onPress === "function");
    const apple = renderer.root
      .findAllByProps({ accessibilityLabel: "Continue with Apple" })
      .find((node) => typeof node.props.onPress === "function");

    expect(google).toBeDefined();
    expect(apple).toBeDefined();
    expect(renderer.root.findByProps({ testID: "google-brand-mark" })).toBeDefined();
    expect(renderer.root.findByProps({ testID: "apple-brand-mark" })).toBeDefined();
    expect(
      renderer.root
        .findAllByProps({ accessibilityLabel: "Continue with Google" })
        .some((node) => node.props.disabled === true),
    ).toBe(false);
    expect(
      renderer.root
        .findAllByProps({ accessibilityLabel: "Continue with Apple" })
        .some((node) => node.props.disabled === true),
    ).toBe(false);

    act(() => google.props.onPress());
    act(() => apple.props.onPress());

    expect(onActionPress.mock.calls).toEqual([
      ["ourpantry.continue-google"],
      ["ourpantry.continue-apple"],
    ]);
  });

  it("keeps actions gated until the final swap and restarts for replayKey", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(<OurPantryWelcome replayKey="first" />);
    });

    expect(
      renderer.root.findByProps({ testID: "ourpantry-welcome-animated" }),
    ).toBeDefined();
    expect(
      renderer.root
        .findAllByProps({ accessibilityLabel: "Continue with Google" })
        .some((node) => typeof node.props.onPress === "function"),
    ).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1733);
    });
    expect(
      renderer.root.findByProps({ testID: "ourpantry-welcome-final" }),
    ).toBeDefined();

    act(() => {
      renderer.update(<OurPantryWelcome replayKey="second" />);
    });
    expect(
      renderer.root.findByProps({ testID: "ourpantry-welcome-animated" }),
    ).toBeDefined();
  });

  it("skips authored motion and exposes the final actions for reduced motion", () => {
    mockReducedMotion.current = true;
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <OurPantryWelcome onActionPress={jest.fn()} />,
      );
    });

    expect(
      renderer.root.findByProps({ testID: "ourpantry-welcome-final" }),
    ).toBeDefined();
    expect(
      renderer.root.findAllByProps({ testID: "ourpantry-welcome-animated" }),
    ).toHaveLength(0);
    expect(
      renderer.root
        .findAllByProps({ accessibilityLabel: "Continue with Google" })
        .some((node) => typeof node.props.onPress === "function"),
    ).toBe(true);
  });

  it("keeps provider loading and errors on the welcome surface", () => {
    let loadingRenderer;
    let errorRenderer;

    act(() => {
      loadingRenderer = TestRenderer.create(
        <OurPantryWelcome
          autoplay={false}
          loadingActionId="ourpantry.continue-google"
          onActionPress={jest.fn()}
        />,
      );
      errorRenderer = TestRenderer.create(
        <OurPantryWelcome
          autoplay={false}
          error="Something went wrong. Please try again."
          onActionPress={jest.fn()}
        />,
      );
    });

    expect(
      loadingRenderer.root.findByProps({ testID: "google-auth-loading" }),
    ).toBeDefined();
    expect(
      loadingRenderer.root
        .findAllByProps({ accessibilityLabel: "Continue with Google" })
        .some((node) => node.props.disabled === true),
    ).toBe(true);
    expect(
      loadingRenderer.root
        .findAllByProps({ accessibilityLabel: "Continue with Apple" })
        .some((node) => node.props.disabled === true),
    ).toBe(true);
    expect(
      errorRenderer.root.findByProps({ accessibilityRole: "alert" }).props
        .children,
    ).toBe("Something went wrong. Please try again.");
  });
});
