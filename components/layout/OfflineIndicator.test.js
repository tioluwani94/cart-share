import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { OfflineIndicator } from "./OfflineIndicator";

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value) => ({ value }),
    withSpring: (value) => value,
    withTiming: (value) => value,
  };
});

jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: { Success: "success", Warning: "warning" },
  notificationAsync: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, right: 0, bottom: 34, left: 0 }),
}));

jest.mock("../../lib/useNetworkStatus", () => ({
  useNetworkStatus: () => ({
    isConnected: false,
    isInternetReachable: false,
    type: "none",
    justCameOnline: false,
  }),
}));

jest.mock("../../lib/SyncStatusContext", () => ({
  useSyncStatusSafe: () => ({ status: "idle" }),
}));

describe("OfflineIndicator", () => {
  it("keeps banner content below the device top safe area", () => {
    let renderer;

    act(() => {
      renderer = TestRenderer.create(<OfflineIndicator />);
    });

    const alert = renderer.root.findByProps({ accessibilityRole: "alert" });
    const styles = Array.isArray(alert.props.style)
      ? alert.props.style
      : [alert.props.style];

    expect(styles).toContainEqual(expect.objectContaining({ paddingTop: 59 }));
  });
});
