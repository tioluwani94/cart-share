import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Linking } from "react-native";

import SettingsScreen from "../app/settings";

const mockUpdatePreferences = jest.fn();
const mockRecalculateReminders = jest.fn();
const mockRegisterForPushNotifications = jest.fn();
const mockPresentSignOutSheet = jest.fn();
const mockDismissSignOutSheet = jest.fn();
let mockPreferences;

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
      return mockPreferences;
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
  registerForPushNotifications: (...args) =>
    mockRegisterForPushNotifications(...args),
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
    GlassBottomSheet: React.forwardRef(({ children }, ref) => {
      React.useImperativeHandle(ref, () => ({
        present: mockPresentSignOutSheet,
        dismiss: mockDismissSignOutSheet,
      }));
      return <View testID="sign-out-sheet">{children}</View>;
    }),
    GlassBottomSheetView: View,
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
    mockPreferences = {
      analyticsConsent: "denied",
      restockNotificationsEnabled: true,
      notificationTimeMinutesLocal: 18 * 60,
      notificationTimeZone: "Europe/London",
    };
    mockUpdatePreferences.mockResolvedValue({ success: true });
    mockRecalculateReminders.mockResolvedValue({ success: true });
    jest.spyOn(Linking, "openSettings").mockResolvedValue();
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

  it("offers device settings after notification permission is denied", async () => {
    mockPreferences = {
      ...mockPreferences,
      restockNotificationsEnabled: false,
    };
    mockRegisterForPushNotifications.mockResolvedValue({ status: "denied" });

    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const reminders = renderer.root.findByProps({
      accessibilityLabel: "Restock reminders",
    });
    await act(async () => {
      await reminders.props.onValueChange(true);
    });

    const openSettings = renderer.root.findByProps({
      accessibilityLabel: "Open device notification settings",
    });
    await act(async () => {
      await openSettings.props.onPress();
    });

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(mockUpdatePreferences).not.toHaveBeenCalledWith({
      restockNotificationsEnabled: true,
    });
  });

  it("presents sign-out confirmation as a bottom sheet", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const signOut = renderer.root.findByProps({
      accessibilityLabel: "Sign out of your account",
    });

    act(() => signOut.props.onPress());

    expect(mockPresentSignOutSheet).toHaveBeenCalledTimes(1);
  });
});
