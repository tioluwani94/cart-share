import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ToastProvider, useToast } from "./Toast";

jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: {
    Success: "success",
    Error: "error",
    Warning: "warning",
  },
  notificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("lucide-react-native", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  const Icon = (props: object) => <View {...props} />;
  return new Proxy({}, { get: () => Icon });
});

jest.mock("react-native-reanimated", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    Easing: { bezier: () => jest.fn() },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (initialValue: unknown) => {
      let current = initialValue;
      return {
        get: () => current,
        set: (nextValue: unknown) => {
          current = nextValue;
        },
      };
    },
    withTiming: (value: unknown) => value,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

function Harness() {
  const { showToast } = useToast();
  return (
    <View>
      <Pressable
        accessibilityLabel="Show success"
        onPress={() =>
          showToast({ message: "Budget saved", tone: "success" })
        }
      />
      <Pressable
        accessibilityLabel="Queue warning"
        onPress={() =>
          showToast({
            message: "Connection is unstable",
            tone: "warning",
            strategy: "queue",
          })
        }
      />
    </View>
  );
}

interface ToastTestNode {
  props: {
    accessibilityLiveRegion?: string;
    accessibilityRole?: string;
    children?: React.ReactNode;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
  };
}

interface ToastTestRoot {
  findAllByType: (type: unknown) => ToastTestNode[];
  findAllByProps: (props: object) => ToastTestNode[];
  findByType: (type: unknown) => ToastTestNode;
  findByProps: (props: object) => ToastTestNode;
}

function rootOf(renderer: ReactTestRenderer): ToastTestRoot {
  return renderer.root as unknown as ToastTestRoot;
}

describe("ToastProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest
      .spyOn(AccessibilityInfo, "isScreenReaderEnabled")
      .mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function renderProvider(): Promise<ReactTestRenderer> {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ToastProvider>
          <Harness />
        </ToastProvider>,
      );
    });
    return renderer!;
  }

  it("renders one compact semantic surface below the persistent header", async () => {
    const renderer = await renderProvider();
    const root = rootOf(renderer);

    await act(async () => {
      root
        .findByProps({ accessibilityLabel: "Show success" })
        .props.onPress();
    });

    const toast = root.findByProps({ testID: "toast" });
    expect(toast.props.accessibilityRole).toBe("alert");
    expect(toast.props.accessibilityLiveRegion).toBe("polite");
    expect(StyleSheet.flatten(toast.props.style).top).toBe(111);
    expect(root.findByType(Text).props.children).toBe("Budget saved");

    const whiteSurfaces = root.findAllByType(View).filter((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.backgroundColor === "#FFFFFF" && style?.maxWidth === 360;
    });
    expect(whiteSurfaces).toHaveLength(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
  });

  it("queues consecutive feedback without overlapping toast surfaces", async () => {
    const renderer = await renderProvider();
    const root = rootOf(renderer);

    await act(async () => {
      root
        .findByProps({ accessibilityLabel: "Show success" })
        .props.onPress();
      root
        .findByProps({ accessibilityLabel: "Queue warning" })
        .props.onPress();
    });

    expect(root.findAllByType(Text)).toHaveLength(1);
    expect(root.findByType(Text).props.children).toBe("Budget saved");

    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      jest.advanceTimersByTime(3150);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(root.findAllByType(Text)).toHaveLength(1);
    expect(root.findByType(Text).props.children).toBe(
      "Connection is unstable",
    );
    expect(Haptics.notificationAsync).toHaveBeenLastCalledWith("warning");
  });
});
