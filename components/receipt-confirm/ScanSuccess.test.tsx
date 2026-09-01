import type { Id } from "@/convex/_generated/dataModel";
import React, { type PropsWithChildren } from "react";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";

import { ScanSuccess } from "./ScanSuccess";

jest.mock("@/components/ui", () => {
  const { Pressable, Text, TextInput, View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Button: ({
      children,
      onPress,
    }: PropsWithChildren<{ onPress?: () => void }>) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {children}
      </Pressable>
    ),
    Input: ({
      accessibilityLabel,
      label,
      onChangeText,
      value,
    }: {
      accessibilityLabel?: string;
      label: string;
      onChangeText: (value: string) => void;
      value: string;
    }) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    ),
  };
});

jest.mock("./receiptStateMotion", () => ({
  RECEIPT_STATE_ENTER: undefined,
}));

jest.mock("react-native-reanimated", () => {
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: { View },
    FadeInUp: {
      springify: () => ({ damping: () => undefined }),
    },
    useReducedMotion: () => true,
  };
});

describe("ScanSuccess", () => {
  it("lets the household add an optional store and choose who paid", () => {
    const onStoreNameChange = jest.fn();
    const onPaidByChange = jest.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ScanSuccess
          extractedTotal={4567}
          handleConfirm={jest.fn()}
          handleNotQuite={jest.fn()}
          paidBy="joint"
          onPaidByChange={onPaidByChange}
          paymentOptions={[
            { value: "joint", label: "Joint account" },
            { value: "user_123" as Id<"users">, label: "Tiolu" },
          ]}
          storeName=""
          onStoreNameChange={onStoreNameChange}
        />,
      );
    });

    const storeInput = renderer.root.findByProps({
      accessibilityLabel: "Store name, optional",
    });
    act(() =>
      (storeInput.props.onChangeText as (value: string) => void)("Tesco Extra"),
    );

    const payer = renderer.root.findByProps({
      accessibilityLabel: "Paid from Tiolu",
    });
    act(() => (payer.props.onPress as () => void)());

    expect(onStoreNameChange).toHaveBeenCalledWith("Tesco Extra");
    expect(onPaidByChange).toHaveBeenCalledWith("user_123");
  });
});
