import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import NotificationSetupScreen from "../app/notification-setup";

const mockReplace = jest.fn();
const mockRegisterDevice = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockRecalculateReminders = jest.fn();
const mockRegisterForPushNotifications = jest.fn();
const mockOpenSettings = jest.fn();

jest.mock("@/components/onboarding/OnboardingFormScreen", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    OnboardingFormScreen: ({ title, description, children, footer }) => (
      <View>
        <Text>{title}</Text>
        <Text>{description}</Text>
        {children}
        {footer}
      </View>
    ),
  };
});

jest.mock("@/components/ui/Button", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    Button: ({ children, onPress, accessibilityLabel, ...props }) => (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        {...props}
      >
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});

jest.mock("@/convex/_generated/api", () => ({
  api: {
    households: { getCurrentHousehold: "getCurrentHousehold" },
    notifications: {
      registerDevice: "registerDevice",
      updatePreferences: "updatePreferences",
      recalculateForHousehold: "recalculateForHousehold",
    },
  },
}));

jest.mock("convex/react", () => ({
  useQuery: () => ({ _id: "household_1" }),
  useMutation: (mutation) => {
    if (mutation === "registerDevice") return mockRegisterDevice;
    if (mutation === "updatePreferences") return mockUpdatePreferences;
    if (mutation === "recalculateForHousehold") {
      return mockRecalculateReminders;
    }
    return jest.fn();
  },
}));

jest.mock("@/lib/pushNotifications", () => ({
  registerForPushNotifications: () => mockRegisterForPushNotifications(),
}));

jest.mock("expo-linking", () => ({
  openSettings: () => mockOpenSettings(),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    cadence_bucket: "7_days",
    origin: "activation",
  }),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { ShieldCheck: () => <View /> };
});

describe("NotificationSetupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegisterDevice.mockResolvedValue({ pushTokenId: "token_1" });
    mockUpdatePreferences.mockResolvedValue({ success: true });
    mockRecalculateReminders.mockResolvedValue({ success: true });
  });

  it("explains notification value without opening the system prompt", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<NotificationSetupScreen />);
    });

    expect(
      renderer.root.findByProps({ children: "Let OurPantry remember" }),
    ).toBeTruthy();
    expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();
  });

  it("enables reminders only after the affirmative action", async () => {
    mockRegisterForPushNotifications.mockResolvedValue({
      status: "granted",
      token: "ExponentPushToken[test]",
      platform: "ios",
      deviceId: "device_1",
    });
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<NotificationSetupScreen />);
    });

    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: "Turn on restock reminders" })
        .props.onPress();
    });

    expect(mockRegisterDevice).toHaveBeenCalledWith({
      token: "ExponentPushToken[test]",
      platform: "ios",
      deviceId: "device_1",
    });
    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      restockNotificationsEnabled: true,
    });
    expect(mockRecalculateReminders).toHaveBeenCalledWith({});
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/analytics-setup",
      params: {
        cadence_bucket: "7_days",
        notification_permission_answered: "granted",
        origin: "activation",
      },
    });
  });

  it("continues without requesting permission when the user chooses not now", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<NotificationSetupScreen />);
    });

    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: "Continue without notifications" })
        .props.onPress();
    });

    expect(mockRegisterForPushNotifications).not.toHaveBeenCalled();
    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      restockNotificationsEnabled: false,
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/analytics-setup",
      params: {
        cadence_bucket: "7_days",
        origin: "activation",
      },
    });
  });

  it("offers device settings after the system permission is denied", async () => {
    mockRegisterForPushNotifications.mockResolvedValue({ status: "denied" });
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<NotificationSetupScreen />);
    });

    await act(async () => {
      await renderer.root
        .findByProps({ accessibilityLabel: "Turn on restock reminders" })
        .props.onPress();
    });

    expect(mockRegisterDevice).not.toHaveBeenCalled();
    const settingsLink = renderer.root.findByProps({
      accessibilityLabel: "Open device notification settings",
    });
    await act(async () => {
      await settingsLink.props.onPress();
    });
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});
