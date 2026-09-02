import React, { type ReactNode } from "react";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";
import {
  Keyboard,
  type PressableProps,
} from "react-native";

import { AddItemInput } from "./AddItemInput";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Error: "error" },
}));

jest.mock("lucide-react-native", () => {
  const { View } = jest.requireActual("react-native");
  return { Plus: () => <View /> };
});

jest.mock("@/components/ui/Button", () => {
  const React = jest.requireActual("react");
  const { Pressable } = jest.requireActual("react-native");
  return {
    Button: ({
      children,
      ...props
    }: PressableProps & { children?: ReactNode }) =>
      React.createElement(Pressable, props, children),
  };
});

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: { View },
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
  };
});

describe("AddItemInput", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("dismisses on Done and does not restore focus after adding", async () => {
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation();
    const onAdd = jest.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<AddItemInput onAdd={onAdd} />);
    });

    const input = renderer.root.findByProps({
      accessibilityLabel: "Add item input",
    });
    act(() =>
      (input.props.onChangeText as (value: string) => void)("Milk"),
    );

    await act(async () => {
      (input.props.onSubmitEditing as () => void)();
      await Promise.resolve();
    });

    expect(input.props.submitBehavior).toBe("blurAndSubmit");
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith("Milk");
    expect(
      renderer.root.findByProps({
        accessibilityLabel: "Add item input",
      }).props.value,
    ).toBe("");
  });

  it("still dismisses when Done is pressed with an empty value", () => {
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <AddItemInput onAdd={jest.fn().mockResolvedValue(undefined)} />,
      );
    });

    const input = renderer.root.findByProps({
      accessibilityLabel: "Add item input",
    });
    act(() => (input.props.onSubmitEditing as () => void)());
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("renders inline when it belongs to the shared footer dock", () => {
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <AddItemInput
          onAdd={jest.fn().mockResolvedValue(undefined)}
          variant="docked"
          keyboardOffset={86}
        />,
      );
    });

    const root = renderer.root as unknown as {
      findAll: (predicate: (node: { props: { className?: string } }) => boolean) => {
        props: { className: string };
      }[];
    };
    const container = root.findAll(
      (node) => node.props.className?.includes("h-full") ?? false,
    )[0];
    expect(container).toBeDefined();
    expect(container.props.className).toContain("h-full");
    expect(container.props.className).toContain("bg-surface");
    expect(container.props.className).not.toContain("absolute");
  });
});
