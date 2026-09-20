import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { NextShopScheduleSheet } from "../components/restocks/NextShopScheduleSheet";
import { NextShopCard } from "../components/restocks/NextShopCard";
import { OtherPlansSection } from "../components/restocks/OtherPlansSection";
import type { Id } from "../convex/_generated/dataModel";

const mockDismiss = jest.fn();
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return function MockDateTimePicker(props: import("@react-native-community/datetimepicker").IOSNativeProps) {
    return <View testID="time-picker" {...props} />;
  };
});
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
  function mount(isOnline = true, plannedFor = Date.parse("2026-09-12T09:00:00Z")) {
    act(() => {
      tree = TestRenderer.create(
        <NextShopScheduleSheet
          plannedFor={plannedFor}
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
  function openTimePicker() {
    if (tree.root.findAllByProps({ testID: "time-picker" }).length === 0) {
      act(() => {
        (tree.root.findAllByProps({ accessibilityLabel: "Choose shopping time" })[0]
          .props.onPress as () => void)();
      });
    }
  }
  function chooseTime(time: string) {
    openTimePicker();
    act(() => {
      props("time-picker").onChange(
        { type: "set" },
        new Date(`2000-01-01T${time}:00Z`),
      );
    });
  }
  it("saves the chosen calendar date, household-local time and mode together", async () => {
    mount();
    chooseTime("14:30");
    act(() => {
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
    chooseTime("15:00");
    act(() => props("header").onClose());
    expect(onSave).not.toHaveBeenCalled();
  });
  it("stays open after a failed save", async () => {
    mount();
    chooseTime("10:30");
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
  it("initializes the picker with household time and preserves every minute", async () => {
    mount(true, Date.parse("2026-09-12T23:07:00Z"));
    openTimePicker();
    expect(props("time-picker").value.toISOString()).toBe("2000-01-01T00:07:00.000Z");
    expect(props("time-picker").timeZoneName).toBe("UTC");
    chooseTime("00:07");
    await act(async () => props("save").onPress());
    expect(onSave).toHaveBeenCalledWith(Date.parse("2026-09-12T23:07:00Z"), "in_store");
  });
  it("rejects a time skipped by daylight saving and clears the error on selection", async () => {
    mount(true, Date.parse("2027-03-28T09:00:00Z"));
    chooseTime("01:30");
    await act(async () => props("save").onPress());
    expect(onSave).not.toHaveBeenCalled();
    expect(tree.root.findAllByProps({ accessibilityRole: "alert" })[0].props.children)
      .toContain("clocks change");
    chooseTime("02:30");
    expect(tree.root.findAllByProps({ accessibilityRole: "alert" })).toHaveLength(0);
    await act(async () => props("save").onPress());
    expect(onSave).toHaveBeenCalledWith(Date.parse("2027-03-28T01:30:00Z"), "in_store");
  });
  it("uses the platform picker and ignores dismissed selections", async () => {
    mount();
    openTimePicker();
    expect(props("time-picker").display).toBe(
      process.env.EXPO_OS === "android" ? "default" : "spinner",
    );
    expect(props("time-picker").value.toISOString()).toBe("2000-01-01T10:00:00.000Z");
    act(() => props("time-picker").onChange({ type: "dismissed" }));
    if (process.env.EXPO_OS === "android") {
      expect(tree.root.findAllByProps({ testID: "time-picker" })).toHaveLength(0);
    }
    await act(async () => props("save").onPress());
    expect(onSave).toHaveBeenCalledWith(Date.parse("2026-09-12T09:00:00Z"), "in_store");
  });
  it("disables time editing until an in-flight save completes", async () => {
    let finishSave!: () => void;
    onSave.mockImplementation(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    mount();
    chooseTime("12:45");
    await act(async () => props("save").onPress());
    expect(tree.root.findAllByProps({ accessibilityLabel: "Choose shopping time" })[0]
      .props.disabled).toBe(true);
    expect(tree.root.findAllByProps({ testID: "time-picker" })).toHaveLength(0);
    await act(async () => finishSave());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
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
