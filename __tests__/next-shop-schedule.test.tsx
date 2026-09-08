import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { NextShopScheduleSheet } from "../components/restocks/NextShopScheduleSheet";
import { NextShopCard } from "../components/restocks/NextShopCard";
import { OtherPlansSection } from "../components/restocks/OtherPlansSection";
import type { Id } from "../convex/_generated/dataModel";

const mockDismiss = jest.fn();
jest.mock("@/components/ui", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    GlassBottomSheet: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: mockDismiss,
      }));
      return <View {...props} />;
    }),
    GlassBottomSheetScrollView: View,
    GlassSheetHeader: (props: any) => <View testID="header" {...props} />,
    Input: (props: any) => <View testID="time" {...props} />,
    GlassSegmentedControl: (props: any) => <View testID="mode" {...props} />,
    Button: (props: any) => <View testID="save" {...props} />,
  };
});

describe("Next shop editor", () => {
  let tree: ReactTestRenderer;
  let onSave: jest.Mock;
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-08T08:00:00Z"));
    mockDismiss.mockClear();
    onSave = jest.fn(async () => {});
  });
  afterEach(() => {
    act(() => tree?.unmount());
    jest.restoreAllMocks();
  });
  function mount(isOnline = true) {
    act(() => {
      tree = TestRenderer.create(
        <NextShopScheduleSheet
          plannedFor={Date.parse("2026-09-12T09:00:00Z")}
          shoppingMode="in_store"
          locale="en-GB"
          timeZone="Europe/London"
          isOnline={isOnline}
          onSave={onSave}
          onClose={jest.fn()}
        />,
      );
    });
  }
  function props(id: string) {
    return tree.root.findByProps({ testID: id }).props as Record<string, any>;
  }
  it("saves the chosen calendar date, household-local time and mode together", async () => {
    mount();
    act(() => {
      props("time").onChangeText("14:30");
      props("mode").onValueChange("online");
    });
    const day = tree.root.findAllByProps({
      accessibilityLabel: "Sunday, 13 September 2026",
    })[0];
    act(() => (day.props.onPress as () => void)());
    await act(async () => {
      props("save").onPress();
    });
    expect(onSave).toHaveBeenCalledWith(
      Date.parse("2026-09-13T13:30:00Z"),
      "online",
    );
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
  it("dismisses without saving when cancelled", () => {
    mount();
    act(() => {
      props("time").onChangeText("15:00");
    });
    act(() => props("header").onClose());
    expect(onSave).not.toHaveBeenCalled();
  });
  it("rejects invalid clocks and stays open after a failed save", async () => {
    mount();
    act(() => props("time").onChangeText("25:00"));
    await act(async () => {
      props("save").onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
    act(() => props("time").onChangeText("10:30"));
    onSave.mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      props("save").onPress();
    });
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(
      tree.root.findAllByProps({ accessibilityRole: "alert" })[0].props
        .children,
    ).toContain("Please try again");
  });
  it("does not submit while offline", async () => {
    mount(false);
    expect(props("save").disabled).toBe(true);
    await act(async () => {
      props("save").onPress();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
  it("opens Shop from the card and keeps the sibling edit action separate", () => {
    const edit = jest.fn();
    const open = jest.fn();
    act(() => {
      tree = TestRenderer.create(
        <NextShopCard
          name="Groceries"
          totalItems={4}
          plannedTotalPence={0}
          shoppingMode="in_store"
          timeZone="Europe/London"
          locale="en-GB"
          onEdit={edit}
          onOpen={open}
        />,
      );
    });
    act(() =>
      (
        tree.root.findAllByProps({
          accessibilityLabel: "Edit shopping date, time and mode",
        })[0].props.onPress as () => void
      )(),
    );
    expect(edit).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    act(() =>
      (
        tree.root.findAllByProps({
          accessibilityLabel: "View Groceries in Shop",
        })[0].props.onPress as () => void
      )(),
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(edit).toHaveBeenCalledTimes(1);
    expect(
      tree.root.findAllByProps({
        accessibilityLabel: "View list, 4 items",
      }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({ children: "Start shopping" }),
    ).toHaveLength(0);
  });
});

describe("Prototype Other plans", () => {
  let tree: ReactTestRenderer;
  afterEach(() => act(() => tree?.unmount()));

  it("shows a real list count and routes each compact row to its own list", () => {
    const open = jest.fn();
    const create = jest.fn();
    act(() => {
      tree = TestRenderer.create(
        <OtherPlansSection
          lists={[
            {
              _id: "other-list" as Id<"lists">,
              name: "Weekend picnic",
              totalItems: 1,
            },
          ]}
          isOnline
          onOpen={open}
          onCreate={create}
        />,
      );
    });
    expect(
      tree.root.findAllByProps({ children: "Other lists" }).length,
    ).toBeGreaterThan(0);
    const row = tree.root.findAllByProps({
      accessibilityLabel: "Weekend picnic, 1 item, separate from next shop",
    })[0];
    expect(row.props.className).toContain("min-h-[78px]");
    act(() => (row.props.onPress as () => void)());
    expect(open).toHaveBeenCalledWith("other-list");
    const button = tree.root.findAllByProps({
      accessibilityLabel: "Create another list",
    })[0];
    expect(button.props.className).toContain("bg-[#F4F3EF]");
    expect(button.props.forceSolid).toBe(true);
    act(() => (button.props.onPress as () => void)());
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("hides an empty Other lists section but keeps creation available (disabled offline)", () => {
    act(() => {
      tree = TestRenderer.create(
        <OtherPlansSection
          lists={[]}
          isOnline={false}
          onOpen={jest.fn()}
          onCreate={jest.fn()}
        />,
      );
    });
    expect(tree.root.findAllByProps({ children: "Other lists" })).toHaveLength(
      0,
    );
    expect(
      tree.root.findAllByProps({ accessibilityRole: "button" }),
    ).toHaveLength(0);
    expect(
      tree.root.findAllByProps({
        accessibilityLabel: "Reconnect to create another list",
      })[0].props.disabled,
    ).toBe(true);
  });
});
