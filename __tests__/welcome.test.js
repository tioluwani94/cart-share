import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import WelcomeScreen from "@/app/(auth)/welcome";

const mockGoogleFlow = jest.fn();
const mockAppleFlow = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useOAuth: ({ strategy }) => ({
    startOAuthFlow:
      strategy === "oauth_google" ? mockGoogleFlow : mockAppleFlow,
  }),
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "cartshare://welcome"),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    Easing: { linear: jest.fn() },
    useAnimatedStyle: jest.fn(() => ({})),
    useReducedMotion: jest.fn(() => false),
    useSharedValue: jest.fn(() => ({ get: jest.fn(), set: jest.fn() })),
    withRepeat: jest.fn(),
    withTiming: jest.fn(),
  };
});

jest.mock("@/components/welcome/OurPantryWelcome", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    OurPantryWelcome: ({ error, onActionPress }) => (
      <View>
        <Pressable
          accessibilityLabel="Continue with Google"
          onPress={() => onActionPress("ourpantry.continue-google")}
        />
        <Pressable
          accessibilityLabel="Continue with Apple"
          onPress={() => onActionPress("ourpantry.continue-apple")}
        />
        {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      </View>
    ),
  };
});

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { Pressable } = require("react-native");

  return {
    Button: ({ accessibilityLabel, children, onPress }) => (
      <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress}>
        {children}
      </Pressable>
    ),
  };
});

describe("welcome authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogleFlow.mockResolvedValue({
      createdSessionId: null,
      setActive: null,
    });
    mockAppleFlow.mockResolvedValue({
      createdSessionId: null,
      setActive: null,
    });
  });

  it("starts each provider directly from the welcome screen", async () => {
    let renderer;

    await act(async () => {
      renderer = TestRenderer.create(<WelcomeScreen />);
    });

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Continue with Google" })
        .props.onPress();
    });

    expect(mockGoogleFlow).toHaveBeenCalledWith({
      redirectUrl: "cartshare://welcome",
    });
    expect(mockAppleFlow).not.toHaveBeenCalled();

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Continue with Apple" })
        .props.onPress();
    });

    expect(mockAppleFlow).toHaveBeenCalledWith({
      redirectUrl: "cartshare://welcome",
    });
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Continue with Google" }),
    ).toBeDefined();
  });
});
