import React from "react";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";

import ReceiptConfirmScreen from "@/app/receipt-confirm";

const mockCreateSession = jest.fn(async () => ({ sessionId: "session_1" }));
const mockDeleteReceipt = jest.fn(async () => undefined);
const mockTrack = jest.fn();
const mockRouter = {
  back: jest.fn(),
  replace: jest.fn(),
};

jest.mock("@/convex/_generated/api", () => ({
  api: {
    households: { getCurrentHousehold: "currentHousehold" },
    items: { getByList: "itemsByList" },
    sessions: {
      create: "createSession",
      getMonthlySessionCount: "monthlyCount",
    },
    storage: {
      completeUpload: "completeUpload",
      deleteFile: "deleteReceipt",
      generateUploadUrl: "generateUploadUrl",
    },
    vision: { processReceipt: "processReceipt" },
  },
}));

jest.mock("convex/react", () => ({
  useAction: () => jest.fn(),
  useMutation: (mutation: string) => {
    if (mutation === "createSession") return mockCreateSession;
    if (mutation === "deleteReceipt") return mockDeleteReceipt;
    return jest.fn();
  },
  useQuery: (query: string) => {
    if (query === "currentHousehold") {
      return {
        _id: "household_1",
        members: [{ user: { _id: "user_2", name: "Partner" } }],
      };
    }
    if (query === "monthlyCount") return { count: 2 };
    if (query === "itemsByList") return [{ _id: "item_1" }];
    return undefined;
  },
}));

jest.mock("@/lib/AnalyticsContext", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

jest.mock("expo-router", () => ({
  router: {
    back: (...args: unknown[]) => mockRouter.back(...args),
    replace: (...args: unknown[]) => mockRouter.replace(...args),
  },
  useLocalSearchParams: () => ({ entry: "manual", listId: "list_1" }),
}));

jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: {
    Error: "error",
    Success: "success",
    Warning: "warning",
  },
  notificationAsync: jest.fn(),
}));

jest.mock("@/components/ui", () => {
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Button: ({
      children,
      onPress,
      accessibilityLabel,
    }: React.PropsWithChildren<{
      onPress?: () => void;
      accessibilityLabel?: string;
    }>) => (
      <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
    PageHeader: ({
      title,
      onBack,
    }: {
      title: string;
      onBack: () => void;
    }) => (
      <View>
        <Pressable accessibilityLabel="Back" onPress={onBack} />
        <Text>{title}</Text>
      </View>
    ),
  };
});

jest.mock("react-native-reanimated", () => ({
  Easing: {
    ease: jest.fn(),
    inOut: () => jest.fn(),
  },
  useSharedValue: <Value,>(initialValue: Value) => ({ value: initialValue }),
  withRepeat: <Value,>(value: Value) => value,
  withSequence: <Value,>(...values: Value[]) => values.at(-1),
  withSpring: <Value,>(value: Value) => value,
  withTiming: <Value,>(value: Value) => value,
}));

jest.mock("@/components/receipt-confirm/ConfettiParticle", () => ({
  ConfettiParticle: () => null,
}));
jest.mock("@/components/receipt-confirm/ManualEntry", () => {
  const { Pressable, Text, TextInput, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    ManualEntry: ({
      handleManualSubmit,
      handleSkip,
      manualAmount,
      setManualAmount,
    }: {
      handleManualSubmit: () => void;
      handleSkip: () => void | Promise<void>;
      manualAmount: string;
      setManualAmount: (value: string) => void;
    }) => (
      <View>
        <TextInput
          accessibilityLabel="Manual amount"
          value={manualAmount}
          onChangeText={setManualAmount}
        />
        <Pressable
          accessibilityLabel="Continue manual amount"
          onPress={handleManualSubmit}
        >
          <Text>Continue</Text>
        </Pressable>
        <Pressable accessibilityLabel="Skip financial details" onPress={handleSkip}>
          <Text>Skip</Text>
        </Pressable>
      </View>
    ),
  };
});
jest.mock("@/components/receipt-confirm/SessionSaved", () => {
  const { Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    SessionSaved: () => <Text accessibilityLabel="Trip saved">Trip saved</Text>,
  };
});

jest.mock("@/components/receipt-confirm/OcrError", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { OcrError: () => <View /> };
});
jest.mock("@/components/receipt-confirm/ProcessingReceipt", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { ProcessingReceipt: () => <View /> };
});
jest.mock("@/components/receipt-confirm/SavingSession", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { SavingSession: () => <View /> };
});
jest.mock("@/components/receipt-confirm/ScanningOverlay", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { ScanningOverlay: () => <View /> };
});
jest.mock("@/components/receipt-confirm/ScanSuccess", () => {
  const { Pressable, Text, TextInput, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    ScanSuccess: ({
      handleConfirm,
      onPaidByChange,
      onStoreNameChange,
      paymentOptions,
      storeName,
    }: {
      handleConfirm: () => void | Promise<void>;
      onPaidByChange: (value: string) => void;
      onStoreNameChange: (value: string) => void;
      paymentOptions: { value: string }[];
      storeName: string;
    }) => (
      <View>
        <TextInput
          accessibilityLabel="Confirmation store"
          value={storeName}
          onChangeText={onStoreNameChange}
        />
        <Pressable
          accessibilityLabel="Choose partner payment source"
          onPress={() => onPaidByChange(paymentOptions[1].value)}
        >
          <Text>Partner</Text>
        </Pressable>
        <Pressable accessibilityLabel="Save confirmed trip" onPress={handleConfirm}>
          <Text>Save</Text>
        </Pressable>
      </View>
    ),
  };
});
jest.mock("@/components/receipt-confirm/UploadError", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { UploadError: () => <View /> };
});
jest.mock("@/components/receipt-confirm/UploadingReceipt", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { UploadingReceipt: () => <View /> };
});

describe("ReceiptConfirmScreen manual completion", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCreateSession.mockClear();
    mockDeleteReceipt.mockClear();
    mockTrack.mockClear();
    mockRouter.back.mockClear();
    mockRouter.replace.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("finishes the originating list without inventing financial data when skipped", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ReceiptConfirmScreen />);
    });

    const skip = renderer.root.findByProps({
      accessibilityLabel: "Skip financial details",
    });
    await act(async () => {
      await (skip.props.onPress as () => Promise<void>)();
    });

    expect(mockCreateSession).toHaveBeenCalledWith({
      householdId: "household_1",
      listId: "list_1",
      paidBy: undefined,
      receiptUploadId: undefined,
      storeName: undefined,
      totalAmount: undefined,
    });
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Trip saved" }),
    ).toBeTruthy();
    expect(mockTrack).toHaveBeenCalledWith("shop completed", {
      household_id: "household_1",
      item_count_bucket: "1-10",
      receipt_present: false,
      total_present: false,
    });
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(mockRouter.replace).toHaveBeenCalledWith("/(tabs)/analytics");
  });

  it("saves a manual total, store, and selected household payer", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<ReceiptConfirmScreen />);
    });

    const amount = renderer.root.findByProps({
      accessibilityLabel: "Manual amount",
    });
    act(() =>
      (amount.props.onChangeText as (value: string) => void)("1,234.56"),
    );
    act(() => {
      const onPress = renderer.root
        .findByProps({ accessibilityLabel: "Continue manual amount" })
        .props.onPress as () => void;
      onPress();
    });

    act(() => {
      const onChangeText = renderer.root
        .findByProps({ accessibilityLabel: "Confirmation store" })
        .props.onChangeText as (value: string) => void;
      onChangeText("Tesco Extra");
    });
    act(() => {
      const onPress = renderer.root
        .findByProps({ accessibilityLabel: "Choose partner payment source" })
        .props.onPress as () => void;
      onPress();
    });
    await act(async () => {
      await (renderer.root
        .findByProps({ accessibilityLabel: "Save confirmed trip" })
        .props.onPress as () => Promise<void>)();
    });

    expect(mockCreateSession).toHaveBeenCalledWith({
      householdId: "household_1",
      listId: "list_1",
      paidBy: "user_2",
      receiptUploadId: undefined,
      storeName: "Tesco Extra",
      totalAmount: 123456,
    });
    expect(mockTrack).toHaveBeenCalledWith("shop completed", {
      household_id: "household_1",
      item_count_bucket: "1-10",
      receipt_present: false,
      total_present: true,
    });
  });
});
