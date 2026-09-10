import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { OfflineIndicator } from "./OfflineIndicator";

let mockConnected = false;
let mockSyncStatus = "idle";
let mockReduceMotion = true;

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");

  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => mockReduceMotion,
    useSharedValue: (value) =>
      jest.requireActual("react").useRef({ value }).current,
    cancelAnimation: jest.fn(),
    Easing: { bezier: () => (value) => value },
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
    isConnected: mockConnected,
    isInternetReachable: false,
    type: "none",
    justCameOnline: false,
  }),
}));

jest.mock("../../lib/SyncStatusContext", () => ({
  useSyncStatusSafe: () => ({ status: mockSyncStatus }),
}));

describe("OfflineIndicator", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockConnected = false;
    mockSyncStatus = "idle";
    mockReduceMotion = true;
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each([true, false])(
    "keeps a fresh offline warning during an older exit (Reduce Motion: %s)",
    (reduced) => {
      mockReduceMotion = reduced;
      let renderer;
      act(() => {
        renderer = TestRenderer.create(<OfflineIndicator />);
      });
      act(() => {
        mockConnected = true;
        renderer.update(<OfflineIndicator />);
      });
      expect(
        renderer.root.findByProps({ accessibilityRole: "alert" }).props
          .accessibilityLabel,
      ).toBe("You're back online!");
      act(() => {
        jest.advanceTimersByTime(2050);
      });
      act(() => {
        mockConnected = false;
        renderer.update(<OfflineIndicator />);
      });
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect(
        renderer.root.findByProps({ accessibilityRole: "alert" }).props
          .accessibilityLabel,
      ).toContain("You're offline");
      act(() => renderer.unmount());
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it("cancels the success dwell on unmount", () => {
    let renderer;
    act(() => {
      renderer = TestRenderer.create(<OfflineIndicator />);
    });
    act(() => {
      mockConnected = true;
      renderer.update(<OfflineIndicator />);
    });
    expect(jest.getTimerCount()).toBe(1);
    act(() => renderer.unmount());
    expect(jest.getTimerCount()).toBe(0);
  });

  it("keeps sync errors visible until recovery", () => {
    mockConnected = true;
    mockSyncStatus = "error";
    let renderer;
    act(() => {
      renderer = TestRenderer.create(<OfflineIndicator />);
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(
      renderer.root.findByProps({ accessibilityRole: "alert" }).props
        .accessibilityLabel,
    ).toContain("another try");
    act(() => {
      mockSyncStatus = "syncing";
      renderer.update(<OfflineIndicator />);
    });
    act(() => {
      mockSyncStatus = "synced";
      renderer.update(<OfflineIndicator />);
    });
    expect(
      renderer.root.findByProps({ accessibilityRole: "alert" }).props
        .accessibilityLabel,
    ).toBe("All synced!");
    act(() => {
      jest.advanceTimersByTime(2150);
    });
    expect(renderer.toJSON()).toBeNull();
    act(() => renderer.unmount());
  });
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
