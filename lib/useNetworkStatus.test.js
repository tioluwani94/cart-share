import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import NetInfo from "@react-native-community/netinfo";
import { useNetworkStatus } from "./useNetworkStatus";

jest.mock("@react-native-community/netinfo", () => {
  const listeners = new Set();
  let currentState = {
    isConnected: true,
    isInternetReachable: true,
    type: "wifi",
  };

  const publish = (state) => {
    currentState = state;
    listeners.forEach((listener) => listener(state));
  };

  return {
    __esModule: true,
    default: {
      fetch: jest.fn(() => new Promise(() => {})),
      refresh: jest.fn(async () => {
        publish(currentState);
        return currentState;
      }),
      addEventListener: jest.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      emit: publish,
      setCurrentStateWithoutEvent: (state) => {
        currentState = state;
      },
    },
  };
});

function NetworkProbe({ onStatus }) {
  const status = useNetworkStatus();
  onStatus(status);
  return null;
}

describe("useNetworkStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("detects a rapid offline to online transition without resubscribing", () => {
    let latestStatus;
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <NetworkProbe onStatus={(status) => (latestStatus = status)} />,
      );
    });

    act(() => {
      NetInfo.emit({
        isConnected: false,
        isInternetReachable: false,
        type: "none",
      });
      NetInfo.emit({
        isConnected: true,
        isInternetReachable: true,
        type: "wifi",
      });
    });

    expect(latestStatus).toEqual(
      expect.objectContaining({
        isConnected: true,
        isInternetReachable: true,
        justCameOnline: true,
      }),
    );
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });

  it("refreshes foreground connectivity when the native reconnect event is missed", async () => {
    jest.useFakeTimers();
    let latestStatus;
    let renderer;

    act(() => {
      renderer = TestRenderer.create(
        <NetworkProbe onStatus={(status) => (latestStatus = status)} />,
      );
    });
    act(() => {
      NetInfo.emit({
        isConnected: false,
        isInternetReachable: false,
        type: "none",
      });
    });
    expect(latestStatus.isConnected).toBe(false);

    NetInfo.setCurrentStateWithoutEvent({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(NetInfo.refresh).toHaveBeenCalled();
    expect(latestStatus).toEqual(
      expect.objectContaining({
        isConnected: true,
        isInternetReachable: true,
        justCameOnline: true,
      }),
    );

    act(() => renderer.unmount());
    jest.useRealTimers();
  });
});
