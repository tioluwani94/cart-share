import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Alert, Linking, Share } from "react-native";

import SettingsScreen from "../app/settings";

const mockUpdatePreferences = jest.fn();
const mockRecalculateReminders = jest.fn();
const mockSaveMonthlyBudget = jest.fn();
const mockRegisterForPushNotifications = jest.fn();
const mockPresentSignOutSheet = jest.fn();
const mockDismissSignOutSheet = jest.fn();
const mockDeleteAccount = jest.fn();
const mockSignOut = jest.fn();
const mockClearAll = jest.fn();
const mockMarkCleanupRequired = jest.fn();
const mockCancelCleanupRequired = jest.fn();
const mockAnalyticsReset = jest.fn();
const mockRouterReplace = jest.fn();
let mockRouteParams = {};
const mockSetParams = jest.fn((params) => { mockRouteParams = { ...mockRouteParams, ...params }; });
const mockShowToast = jest.fn();
let mockPreferences;
let mockHousehold;
let mockArchivedLists;
let mockIsConvexAuthenticated;
const mockUseQuery = jest.fn((query, args) => {
  if (args === "skip") return undefined;
  if (query === "getCurrentHousehold") {
    return mockHousehold;
  }
  if (query === "getPreferences") {
    return mockPreferences;
  }
  if (query === "getArchivedByHousehold") return mockArchivedLists;
  return undefined;
});

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
  useConvexAuth: () => ({ isAuthenticated: mockIsConvexAuthenticated }),
  useQuery: (...args) => mockUseQuery(...args),
  useMutation: (mutation) => {
    if (mutation === "updatePreferences") return mockUpdatePreferences;
    if (mutation === "recalculateForHousehold") {
      return mockRecalculateReminders;
    }
    if (mutation === "setMonthlyBudget") return mockSaveMonthlyBudget;
    return jest.fn();
  },
}));

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ signOut: mockSignOut }),
  useUser: () => ({ user: { delete: mockDeleteAccount } }),
  isClerkAPIResponseError: (error) => error?.isClerkAPIResponseError === true,
}));

jest.mock("@/lib/AnalyticsContext", () => ({
  useAnalytics: () => ({
    reset: mockAnalyticsReset,
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
  useRouter: () => ({ back: jest.fn(), replace: mockRouterReplace, setParams: mockSetParams }),
  useLocalSearchParams: () => mockRouteParams,
}));

jest.mock("@/lib/storage", () => ({
  clearAllOrThrow: (...args) => mockClearAll(...args),
}));

jest.mock("@/lib/accountDeletionCleanup", () => ({
  markAccountDeletionCleanupRequired: (...args) =>
    mockMarkCleanupRequired(...args),
  cancelAccountDeletionCleanup: (...args) => mockCancelCleanupRequired(...args),
  finishAccountDeletionLocalCleanup: (...args) => mockClearAll(...args),
}));

jest.mock("@/components/ui", () => {
  const React = require("react");
  const { Pressable, Text, TextInput, View } = require("react-native");
  const { formatCurrencyInput } = jest.requireActual("@/lib/formatters");
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
    GlassSheetHeader: ({
      title,
      description,
      onClose,
      closeAccessibilityLabel,
    }) => (
      <View>
        <Text>{title}</Text>
        {description ? <Text>{description}</Text> : null}
        <Pressable
          onPress={onClose}
          accessibilityLabel={closeAccessibilityLabel}
        />
      </View>
    ),
    Input: ({ value, onChangeText, accessibilityLabel }) => (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
      />
    ),
    AmountInput: ({ value, onChangeText, accessibilityLabel }) => (
      <TextInput
        value={value}
        onChangeText={(nextValue) =>
          onChangeText(formatCurrencyInput(nextValue))
        }
        accessibilityLabel={accessibilityLabel}
      />
    ),
    PageHeader: () => <View />,
    usePageHeaderHeight: () => 103,
    useToast: () => ({ showToast: mockShowToast }),
    UserAvatar: () => <View />,
  };
});

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => jest.fn() },
    LinearTransition: {
      duration: () => ({ reduceMotion: () => undefined }),
    },
    ReduceMotion: { System: "system" },
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (initialValue) => ({
      get: () => initialValue,
      set: jest.fn(),
    }),
    withTiming: (value) => value,
  };
});

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockIsConvexAuthenticated = true;
    mockPreferences = {
      analyticsConsent: "denied",
      restockNotificationsEnabled: true,
      notificationTimeMinutesLocal: 18 * 60,
      notificationTimeZone: "Europe/London",
    };
    mockHousehold = {
      _id: "household_1",
      name: "Test household",
      inviteCode: "ABC123",
      userRole: "owner",
      monthlyBudgetPence: 40_000,
      members: [
        {
          _id: "membership_1",
          userId: "user_1",
          role: "owner",
          user: { name: "Test User" },
        },
      ],
    };
    mockArchivedLists = [];
    mockDeleteAccount.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockMarkCleanupRequired.mockResolvedValue(undefined);
    mockCancelCleanupRequired.mockResolvedValue(undefined);
    mockClearAll.mockResolvedValue(undefined);
    mockAnalyticsReset.mockResolvedValue(undefined);
    mockUpdatePreferences.mockResolvedValue({ success: true });
    mockRecalculateReminders.mockResolvedValue({ success: true });
    mockSaveMonthlyBudget.mockResolvedValue({ success: true });
    jest.spyOn(Linking, "openSettings").mockResolvedValue();
    jest.spyOn(Linking, "openURL").mockResolvedValue();
    jest.spyOn(Share, "share").mockResolvedValue({
      action: Share.dismissedAction,
    });
  });

  it("opens the native share sheet for a household invite", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const shareInvite = renderer.root.findByProps({
      accessibilityLabel: "Share invite to Test household, code ABC123",
    });

    await act(async () => {
      await shareInvite.props.onPress();
    });

    expect(Share.share).toHaveBeenCalledWith({
      title: "Join Test household on OurPantry",
      message: "Join Test household on OurPantry using invite code ABC123.",
    });
  });

  it("opens the verified legal and support pages", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    for (const [accessibilityLabel, expectedUrl] of [
      ["Open Privacy Policy", "https://ourpantry.app/privacy"],
      ["Open Terms of Use", "https://ourpantry.app/terms"],
      ["Open OurPantry Support", "https://ourpantry.app/support"],
    ]) {
      await act(async () => {
        await renderer.root.findByProps({ accessibilityLabel }).props.onPress();
      });
      expect(Linking.openURL).toHaveBeenLastCalledWith(expectedUrl);
    }
  });

  it("lets this member choose an earlier reminder time", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const reminderTime = renderer.root.findByProps({
      accessibilityLabel: "Change reminder time, current time 18:00",
    });

    act(() => reminderTime.props.onPress());
    expect(mockPresentSignOutSheet).toHaveBeenCalledTimes(1);

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

  it("edits the monthly budget in a focused sheet", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const budget = renderer.root.findByProps({
      accessibilityLabel: "Edit monthly grocery budget, current value £400.00",
    });
    act(() => budget.props.onPress());
    expect(mockPresentSignOutSheet).toHaveBeenCalledTimes(1);

    const input = renderer.root.findByProps({
      accessibilityLabel: "Monthly grocery budget amount",
    });
    act(() => input.props.onChangeText("1,234.56"));

    const save = renderer.root.findByProps({
      accessibilityLabel: "Save monthly grocery budget",
    });
    await act(async () => {
      await save.props.onPress();
    });

    expect(mockSaveMonthlyBudget).toHaveBeenCalledWith({
      monthlyBudgetPence: 123_456,
    });
    expect(mockShowToast).toHaveBeenCalledWith({
      message: "Budget saved",
      tone: "success",
    });
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
      accessibilityLabel: "Shopping insights and reminders",
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

  it("opens the budget editor once from Spending after household data loads", async () => {
    mockRouteParams = { edit: "budget" };
    const loadedHousehold = mockHousehold;
    mockHousehold = undefined;
    let renderer;
    await act(async () => { renderer = TestRenderer.create(<SettingsScreen />); });
    expect(mockPresentSignOutSheet).not.toHaveBeenCalled();
    mockHousehold = loadedHousehold;
    await act(async () => { renderer.update(<SettingsScreen />); });
    expect(mockPresentSignOutSheet).toHaveBeenCalledTimes(1);
    expect(mockSetParams).toHaveBeenCalledWith({ edit: undefined });
    mockHousehold = { ...loadedHousehold, monthlyBudgetPence: 50000 };
    await act(async () => { renderer.update(<SettingsScreen />); });
    expect(mockPresentSignOutSheet).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
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

  it("stops authenticated queries as soon as sign out begins", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    mockUseQuery.mockClear();
    const confirmSignOut = renderer.root.findAllByProps({
      variant: "danger",
    })[0];

    await act(async () => {
      await confirmSignOut.props.onPress();
    });

    expect(mockUseQuery).toHaveBeenCalledWith("getCurrentHousehold", "skip");
    expect(mockUseQuery).toHaveBeenCalledWith("getPreferences", "skip");
    expect(mockUseQuery).toHaveBeenCalledWith("getArchivedByHousehold", "skip");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation before deleting Clerk and local account data", async () => {
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const deleteAccount = renderer.root.findByProps({
      accessibilityLabel: "Delete your account",
    });
    act(() => deleteAccount.props.onPress());
    expect(mockPresentSignOutSheet).toHaveBeenCalledTimes(1);

    const confirm = renderer.root.findByProps({
      accessibilityLabel: "Permanently delete your account",
    });
    await act(async () => {
      await confirm.props.onPress();
    });

    expect(mockDismissSignOutSheet).toHaveBeenCalled();
    expect(mockDismissSignOutSheet.mock.invocationCallOrder[0]).toBeLessThan(mockDeleteAccount.mock.invocationCallOrder[0]);
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(mockMarkCleanupRequired).toHaveBeenCalledTimes(1);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(mockMarkCleanupRequired.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteAccount.mock.invocationCallOrder[0],
    );
    expect(mockDeleteAccount.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearAll.mock.invocationCallOrder[0],
    );
    expect(mockAnalyticsReset).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith("/(auth)/welcome");
  });

  it("keeps the confirmation mounted while paused queries and deletion are in flight", async () => {
    let resolveDeletion;
    mockDeleteAccount.mockImplementationOnce(() => new Promise(resolve => { resolveDeletion = resolve; }));
    let renderer;
    await act(async () => { renderer = TestRenderer.create(<SettingsScreen />); });
    let pending;
    await act(async () => {
      pending = renderer.root.findByProps({ accessibilityLabel: "Permanently delete your account" }).props.onPress();
    });
    expect(mockUseQuery).toHaveBeenCalledWith("getCurrentHousehold", "skip");
    expect(renderer.root.findByProps({ accessibilityLabel: "Permanently delete your account" }).props.loading).toBe(true);
    expect(mockDismissSignOutSheet).toHaveBeenCalledWith({ duration: 0 });
    await act(async () => { resolveDeletion(); await pending; });
    expect(mockRouterReplace).toHaveBeenCalledWith("/(auth)/welcome");
    act(() => renderer.unmount());
  });

  it("stays in Settings when Clerk refuses account deletion", async () => {
    mockDeleteAccount.mockRejectedValueOnce(
      Object.assign(new Error("Deletion disabled"), {
        isClerkAPIResponseError: true,
        status: 403,
      }),
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const confirm = renderer.root.findByProps({
      accessibilityLabel: "Permanently delete your account",
    });
    await act(async () => {
      await confirm.props.onPress();
    });

    expect(mockClearAll).not.toHaveBeenCalled();
    expect(mockCancelCleanupRequired).toHaveBeenCalledTimes(1);
    expect(mockPresentSignOutSheet).toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({ accessibilityRole: "alert" }).props.children,
    ).toContain("account was not deleted");
    consoleError.mockRestore();
  });

  it("removes local identity when provider deletion has an ambiguous result", async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error("Network unavailable"));
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const confirm = renderer.root.findByProps({
      accessibilityLabel: "Permanently delete your account",
    });
    await act(async () => {
      await confirm.props.onPress();
    });

    expect(mockCancelCleanupRequired).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Deletion status unconfirmed",
      expect.stringContaining("local data"),
      expect.any(Array),
    );
    const actions = alert.mock.calls[0][2];
    act(() => actions[0].onPress());
    expect(mockRouterReplace).toHaveBeenCalledWith("/(auth)/welcome");
    alert.mockRestore();
    consoleError.mockRestore();
  });

  it("does not claim success when ambiguous deletion also needs a cleanup retry", async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error("Network unavailable"));
    mockClearAll.mockRejectedValueOnce(new Error("MMKV unavailable"));
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const confirm = renderer.root.findByProps({
      accessibilityLabel: "Permanently delete your account",
    });
    await act(async () => {
      await confirm.props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      "Deletion status unconfirmed",
      expect.stringContaining("local data"),
      expect.any(Array),
    );
    expect(alert.mock.calls[0][0]).not.toBe("Account deleted");
    alert.mockRestore();
    consoleError.mockRestore();
  });

  it("reports a local cleanup failure accurately after Clerk deletion", async () => {
    mockClearAll.mockImplementationOnce(() => {
      throw new Error("MMKV unavailable");
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const confirm = renderer.root.findByProps({
      accessibilityLabel: "Permanently delete your account",
    });
    await act(async () => {
      await confirm.props.onPress();
    });

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      "Account deleted",
      expect.stringContaining("local data"),
      expect.any(Array),
    );
    const actions = alert.mock.calls[0][2];
    await act(async () => {
      await actions[0].onPress();
    });
    expect(mockClearAll).toHaveBeenCalledTimes(2);
    expect(mockRouterReplace).toHaveBeenCalledWith("/(auth)/welcome");
    alert.mockRestore();
    consoleError.mockRestore();
  });

  it("continues deletion when analytics identity reset fails", async () => {
    mockAnalyticsReset.mockRejectedValueOnce(new Error("PostHog unavailable"));
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation();
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<SettingsScreen />);
    });

    const confirm = renderer.root.findByProps({
      accessibilityLabel: "Permanently delete your account",
    });
    await act(async () => {
      await confirm.props.onPress();
    });

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith("/(auth)/welcome");
    consoleWarn.mockRestore();
  });
});
