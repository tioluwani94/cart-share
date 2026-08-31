import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import RestockSetupScreen from "./restock-setup";

const mockReplace = jest.fn();
const mockCompleteSetup = jest.fn();
const mockCreateList = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockRegisterDevice = jest.fn();
const mockRecalculateReminders = jest.fn();
const mockAnalytics = {
  setConsent: jest.fn(),
  track: jest.fn(),
};

jest.mock("@/convex/_generated/api", () => ({
  api: {
    households: { getCurrentHousehold: "getCurrentHousehold" },
    lists: { getByHousehold: "getLists", create: "createList" },
    restocks: {
      getActivationSuggestions: "getActivationSuggestions",
      completeSetup: "completeSetup",
    },
    notifications: {
      updatePreferences: "updatePreferences",
      registerDevice: "registerDevice",
      recalculateForHousehold: "recalculateForHousehold",
    },
  },
}));

jest.mock("convex/react", () => ({
  useQuery: (query) => {
    if (query === "getCurrentHousehold") {
      return { _id: "household_1" };
    }
    if (query === "getLists") {
      return [{ _id: "list_1", name: "Weekly shop", totalItems: 3 }];
    }
    if (query === "getActivationSuggestions") return [];
    return undefined;
  },
  useMutation: (mutation) => {
    if (mutation === "completeSetup") return mockCompleteSetup;
    if (mutation === "createList") return mockCreateList;
    if (mutation === "updatePreferences") return mockUpdatePreferences;
    if (mutation === "registerDevice") return mockRegisterDevice;
    if (mutation === "recalculateForHousehold") {
      return mockRecalculateReminders;
    }
    return jest.fn();
  },
}));

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
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
    GlassSegmentedControl: () => <View />,
  };
});

jest.mock("@/lib/AnalyticsContext", () => ({
  useAnalytics: () => mockAnalytics,
}));

jest.mock("@/lib/pushNotifications", () => ({
  registerForPushNotifications: jest.fn(),
}));

jest.mock("expo-localization", () => ({
  getCalendars: () => [{ timeZone: "Europe/London" }],
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return {
    Bell: Icon,
    Check: Icon,
    Minus: Icon,
    Plus: Icon,
    ShieldCheck: Icon,
  };
});

describe("RestockSetupScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteSetup.mockResolvedValue({ success: true });
    mockUpdatePreferences.mockResolvedValue({ success: true });
  });

  it("lets a household defer activation without replacing its existing list", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<RestockSetupScreen />);
    });

    const skip = renderer.root.findByProps({
      accessibilityLabel: "Set up grocery rhythm later",
    });

    await act(async () => {
      await skip.props.onPress();
    });

    expect(mockCreateList).not.toHaveBeenCalled();
    expect(mockCompleteSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        activeListId: "list_1",
        products: [],
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
  });
});
