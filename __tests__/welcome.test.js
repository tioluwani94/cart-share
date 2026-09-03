import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import WelcomeScreen from "@/app/(auth)/welcome";

const mockSSOFlow = jest.fn();
const mockOpenURL = jest.fn();

jest.mock("@clerk/expo", () => ({
  useSSO: () => ({ startSSOFlow: mockSSOFlow }),
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "ourpantry://welcome"),
  openURL: (...args) => mockOpenURL(...args),
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
    OurPantryWelcome: ({
      error,
      onActionPress,
      onTermsPress,
      onPrivacyPress,
    }) => (
      <View>
        <Pressable
          accessibilityLabel="Continue with Google"
          onPress={() => onActionPress("ourpantry.continue-google")}
        />
        <Pressable
          accessibilityLabel="Continue with Apple"
          onPress={() => onActionPress("ourpantry.continue-apple")}
        />
        <Pressable accessibilityLabel="Open Terms of Use" onPress={onTermsPress} />
        <Pressable
          accessibilityLabel="Open Privacy Policy"
          onPress={onPrivacyPress}
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
    mockSSOFlow.mockResolvedValue({
      createdSessionId: null,
      setActive: null,
    });
    mockOpenURL.mockResolvedValue(undefined);
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

    expect(mockSSOFlow).toHaveBeenNthCalledWith(1, {
      strategy: "oauth_google",
      redirectUrl: "ourpantry://welcome",
    });
    expect(mockSSOFlow).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Continue with Apple" })
        .props.onPress();
    });

    expect(mockSSOFlow).toHaveBeenNthCalledWith(2, {
      strategy: "oauth_apple",
      redirectUrl: "ourpantry://welcome",
    });
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Continue with Google" }),
    ).toBeDefined();
  });

  it("opens the verified Terms and Privacy pages", async () => {
    let renderer;

    await act(async () => {
      renderer = TestRenderer.create(<WelcomeScreen />);
    });

    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Open Terms of Use" })
        .props.onPress();
    });
    await act(async () => {
      renderer.root
        .findByProps({ accessibilityLabel: "Open Privacy Policy" })
        .props.onPress();
    });

    expect(mockOpenURL.mock.calls).toEqual([
      ["https://ourpantry.app/terms"],
      ["https://ourpantry.app/privacy"],
    ]);
  });
});
