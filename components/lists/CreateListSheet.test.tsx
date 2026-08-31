import React, { type ReactNode } from "react";
import type { PressableProps, TextInputProps } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { CreateListSheet } from "./CreateListSheet";

const mockCreateList = jest.fn();
const mockRecalculate = jest.fn();
let mockIsOnline = true;

jest.mock("@/convex/_generated/api", () => ({
  api: {
    households: { getCurrentHousehold: "getCurrentHousehold" },
    lists: { create: "createList" },
    notifications: { recalculateForHousehold: "recalculate" },
  },
}));

jest.mock("convex/react", () => ({
  useQuery: () => ({ _id: "household_1" }),
  useMutation: (mutation: string) =>
    mutation === "createList" ? mockCreateList : mockRecalculate,
}));

jest.mock("@/components/ui", () => {
  const { Pressable, Text, TextInput, View } = jest.requireActual<
    typeof import("react-native")
  >("react-native");
  return {
    Button: ({
      children,
      ...props
    }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>
        {typeof children === "string" ? <Text>{children}</Text> : children}
      </Pressable>
    ),
    GlassBottomSheet: ({ children }: { children?: ReactNode }) => (
      <View>{children}</View>
    ),
    GlassBottomSheetScrollView: ({ children }: { children?: ReactNode }) => (
      <View>{children}</View>
    ),
    Input: ({ label, ...props }: TextInputProps & { label: string }) => (
      <TextInput accessibilityLabel={label} {...props} />
    ),
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Error: "error", Success: "success" },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/useNetworkStatus", () => ({
  useIsOnline: () => mockIsOnline,
}));

jest.mock("lucide-react-native", () => {
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

jest.mock("./CategoryChip", () => ({
  CATEGORIES: [],
  CategoryChip: () => null,
}));

jest.mock("./SuccessCelebration", () => ({
  SuccessCelebration: () => null,
}));

describe("CreateListSheet", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCreateList.mockResolvedValue({ listId: "list_1" });
    mockRecalculate.mockResolvedValue(undefined);
    mockIsOnline = true;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("atomically marks a newly created list as the Next shop when requested", async () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<CreateListSheet setAsNextShop />);
    });

    act(() => {
      const input = renderer.root.findByProps({
        accessibilityLabel: "List name",
      });
      (input.props as { onChangeText: (value: string) => void }).onChangeText(
        "Weekly shop",
      );
    });

    await act(async () => {
      const create = renderer.root.findByProps({
        accessibilityLabel: "Create Next shop",
      });
      await (create.props as { onPress: () => Promise<void> }).onPress();
      jest.runOnlyPendingTimers();
    });

    expect(mockCreateList).toHaveBeenCalledWith({
      category: undefined,
      householdId: "household_1",
      name: "Weekly shop",
      onlyIfNoActiveList: true,
      setAsNextShop: true,
      tripBudgetPence: undefined,
    });
    expect(mockRecalculate).toHaveBeenCalledWith({});
  });

  it("keeps list creation dismissible by refusing to start offline", () => {
    mockIsOnline = false;
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<CreateListSheet setAsNextShop />);
    });

    const create = renderer.root.findByProps({
      accessibilityLabel: "Reconnect to create Next shop",
    });
    expect(create.props.disabled).toBe(true);
    expect(mockCreateList).not.toHaveBeenCalled();
  });
});
