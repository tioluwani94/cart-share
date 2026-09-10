import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { FinishShopSheet } from "./FinishShopSheet";
import type { Id } from "@/convex/_generated/dataModel";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/components/ui", () => {
  const { View } = jest.requireActual("react-native");
  return {
    GlassBottomSheet: View,
    GlassBottomSheetScrollView: View,
    GlassSheetHeader: View,
  };
});
jest.mock("lucide-react-native", () => {
  const { View } = jest.requireActual("react-native");
  return { Camera: View, Check: View, PoundSterling: View, Receipt: View };
});

describe("FinishShopSheet", () => {
  beforeEach(() => jest.clearAllMocks());
  const defaults = {
    listId: "next_shop" as Id<"lists">,
    completedCount: 2,
    totalCount: 3,
    canFinish: true,
    canScanReceipt: true,
    isFinishing: false,
    finishUnavailableMessage: null,
    finishError: null,
    onClose: jest.fn(),
    onFinishWithoutReceipt: jest.fn(async () => {}),
  };
  it.each(["next_shop", "another_list"])(
    "preserves %s for scan and manual entry",
    (id) => {
      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = TestRenderer.create(
          <FinishShopSheet {...defaults} listId={id as Id<"lists">} />,
        );
      });
      act(() =>
        (
          renderer.root.findByProps({ accessibilityLabel: "Scan a receipt" })
            .props.onPress as () => Promise<void>
        )(),
      );
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: "/scan-receipt",
        params: { listId: id },
      });
      act(() =>
        (
          renderer.root.findByProps({
            accessibilityLabel: "Enter shopping total",
          }).props.onPress as () => Promise<void>
        )(),
      );
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: "/receipt-confirm",
        params: { entry: "manual", listId: id },
      });
      expect(defaults.onClose).toHaveBeenCalledTimes(2);
      act(() => renderer.unmount());
    },
  );
  it("allows offline completion while disabling spend entry", async () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <FinishShopSheet {...defaults} canScanReceipt={false} />,
      );
    });
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Scan a receipt" }).props
        .disabled,
    ).toBe(true);
    expect(
      renderer.root.findByProps({ accessibilityLabel: "Enter shopping total" })
        .props.disabled,
    ).toBe(true);
    const skip = renderer.root.findByProps({
      accessibilityLabel: "Finish without a receipt",
    });
    expect(skip.props.disabled).toBe(false);
    await act(async () => (skip.props.onPress as () => void)());
    expect(defaults.onFinishWithoutReceipt).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });
});
