import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import SettingsScreen from "./settings";

const mockUpdatePreferences = jest.fn();
const mockRecalculateReminders = jest.fn();

jest.mock("@/convex/_generated/api", () => ({
  api: {
    households: {
      getCurrentHousehold: "getCurrentHousehold",
      setMonthlyBudget: "setMonthlyBudget",
    },
    notifications: {
      getPreferences: "getPreferences",
      disableAllDevices: "disableAllDevices",
      disableDevice: "disableDevice",
      updatePreferences: "updatePreferences",
      registerDevice: "registerDevice",
      recalculateForHousehold: "recalculateForHousehold",
    },
    lists: {
      getArchivedByHousehold: "getArchivedByHousehold",
      unarchive: "unarchive",
    },
  },
}));

jest.mock("convex/react", () => ({
  useQuery: (query) => {
    if (query === "getCurrentHousehold") {
      return {
        _id: "household_1",
        name: "Test household",
        inviteCode: "ABC123",
        members: [],
      };
    }
    if (query === "getPreferences") {
      return {
        analyticsConsent: "denied",
        restockNotificationsEnabled: true,
        notificationTimeMinutesLocal: 18 * 60,
        notificationTimeZone: "Europe/London",
      };
    }
    if (query === "getArchivedByHousehold") return [];
    return undefined;
  },
  useMutation: (mutation) => {
    if (mutation === "updatePreferences") return mockUpdatePreferences;
    if (mutation === "recalculateForHousehold") {
      return mockRecalculateReminders;
    }
    return jest.fn();
  },
}));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));

jest.mock("@/lib/AnalyticsContext", () => ({
  useAnalytics: () => ({
    reset: jest.fn(),
    setConsent: jest.fn(),
    track: jest.fn(),
  }),
}));

jest.mock("@/lib/pushNotifications", () => ({
  getCurrentDeviceId: jest.fn(),
  registerForPushNotifications: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { Pressable, Text, TextInput, View } = require("react-native");
  return {
    Button: ({ children, onPress, accessibilityLabel, ...props }) => (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        {...props}
      >
        {typeof children === "string" ? <Text>{children}</Text> : children}
      </Pressable>
    ),
    GlassSegmentedControl: ({ options, onValueChange, disabled }) => (
      <View>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            disabled={disabled}
            onPress={() => onValueChange(option.value)}
          >
            <Text>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    ),
    Input: ({ value, onChangeText, accessibilityLabel }) => (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
      />
    ),
    PageHeader: () => <View />,
    Toast: () => null,
    UserAvatar: () => <View />,
  };
});

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdatePreferences.mockResolvedValue({ success: true });
    mockRecalculateReminders.mockResolvedValue({ success: true });
  });

  it("lets this member choose an earlier reminder time", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const morning = renderer.root.findByProps({
      accessibilityLabel: "Send reminders at 09:00",
    });

    await act(async () => {
      await morning.props.onPress();
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      notificationTimeMinutesLocal: 9 * 60,
    });
    expect(mockRecalculateReminders).toHaveBeenCalledWith({});
  });
});
