import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import type { Id } from "@/convex/_generated/dataModel";
import { ListItem } from "./ListItem";

const mockShowToast = jest.fn();

jest.mock("@/components/ui", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    UserAvatar: () => React.createElement(View),
    useToast: () => ({ showToast: mockShowToast, dismissToast: jest.fn() }),
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

jest.mock("lucide-react-native", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  const Icon = () => React.createElement(View);
  return {
    Check: Icon,
    Trash2: Icon,
    Pencil: Icon,
    RefreshCw: Icon,
  };
});

jest.mock("react-native-gesture-handler", () => {
  interface MockGesture {
    enabled: jest.Mock;
    activeOffsetX: jest.Mock;
    failOffsetY: jest.Mock;
    onBegin: jest.Mock;
    onUpdate: jest.Mock;
    onEnd: jest.Mock;
  }
  const gesture = {} as MockGesture;
  gesture.enabled = jest.fn(() => gesture);
  gesture.activeOffsetX = jest.fn(() => gesture);
  gesture.failOffsetY = jest.fn(() => gesture);
  gesture.onBegin = jest.fn(() => gesture);
  gesture.onUpdate = jest.fn(() => gesture);
  gesture.onEnd = jest.fn(() => gesture);
  return {
    Gesture: { Pan: () => gesture },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock("react-native-reanimated", () => {
  const { Text, View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (Component: React.ComponentType) => Component,
    },
    Easing: { out: (value: unknown) => value, quad: "quad" },
    Extrapolation: { CLAMP: "clamp" },
    interpolate: (
      _value: number,
      _input: number[],
      output: number[],
    ) => output[0],
    interpolateColor: (
      _value: number,
      _input: number[],
      output: string[],
    ) => output[0],
    runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
    useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_delay: number, value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values.at(-1),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

const itemId = "item-1" as Id<"items">;

function renderListItem(overrides: Partial<React.ComponentProps<typeof ListItem>> = {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <ListItem
        id={itemId}
        name="Pasta"
        isCompleted={false}
        onToggle={jest.fn()}
        onDelete={jest.fn().mockResolvedValue(undefined)}
        onEdit={jest.fn()}
        isSwipeOpen
        onSwipeOpen={jest.fn()}
        onSwipeClose={jest.fn()}
        {...overrides}
      />,
    );
  });
  return renderer;
}

function pressByLabel(renderer: ReactTestRenderer, accessibilityLabel: string) {
  const button = renderer.root.findByProps({ accessibilityLabel });
  const onPress = button.props.onPress as () => void;
  onPress();
}

describe("ListItem swipe actions", () => {
  beforeEach(() => {
    mockShowToast.mockClear();
  });

  it("invokes Edit with the selected item's complete editable payload", () => {
    const onEdit = jest.fn();
    const onSwipeClose = jest.fn();
    const renderer = renderListItem({
      name: "Pasta",
      quantity: 2,
      unit: "packs",
      notes: "Wholewheat",
      category: "Groceries",
      estimatedPricePence: 425,
      onEdit,
      onSwipeClose,
    });

    act(() => {
      pressByLabel(renderer, "Edit item");
    });

    expect(onEdit).toHaveBeenCalledWith({
      id: itemId,
      name: "Pasta",
      quantity: 2,
      unit: "packs",
      notes: "Wholewheat",
      category: "Groceries",
      estimatedPricePence: 425,
    });
    expect(onSwipeClose).toHaveBeenCalledWith(itemId);
  });

  it("keeps a failed deletion recoverable and explains the failure", async () => {
    const onDelete = jest.fn().mockRejectedValue(new Error("network"));
    const onSwipeOpen = jest.fn();
    const errorSpy = jest.spyOn(console, "error").mockImplementation();
    const renderer = renderListItem({ onDelete, onSwipeOpen });

    await act(async () => {
      pressByLabel(renderer, "Delete item");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onDelete).toHaveBeenCalledWith(itemId);
    expect(onSwipeOpen).toHaveBeenCalledWith(itemId);
    expect(mockShowToast).toHaveBeenCalledWith({
      message: "Couldn't delete this item. Please try again.",
      tone: "error",
    });
    errorSpy.mockRestore();
  });
});
