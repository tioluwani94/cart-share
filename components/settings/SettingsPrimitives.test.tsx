import React from "react";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import {
  SettingsChoiceRow,
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from "./SettingsPrimitives";

type QueryableTestInstance = ReactTestInstance & {
  findAll: (
    predicate: (node: ReactTestInstance) => boolean,
  ) => ReactTestInstance[];
};

jest.mock("react-native-reanimated", () => {
  // Jest hoists this factory, so the React Native test host must be loaded here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => jest.fn() },
    LinearTransition: { duration: () => ({ reduceMotion: () => undefined }) },
    ReduceMotion: { System: "system" },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (initialValue: unknown) => ({
      current: initialValue,
      get() {
        return this.current;
      },
      set(nextValue: unknown) {
        this.current = nextValue;
      },
    }),
    withTiming: (value: unknown) => value,
  };
});

describe("Settings primitives", () => {
  it("groups rows under an accessible section heading and footer", () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <SettingsSection title="Planning" footer="Shared with your household">
          <SettingsRow title="Monthly grocery budget" isLast />
        </SettingsSection>,
      );
    });

    const heading = renderer!.root.findByProps({
      accessibilityRole: "header",
    });
    const footer = renderer!.root.findByProps({
      children: "Shared with your household",
    });

    expect(heading.props.accessibilityRole).toBe("header");
    expect(footer).toBeDefined();
  });

  it("exposes disclosure state and invokes the row action", () => {
    const onPress = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <SettingsRow
          title="Archived lists"
          onPress={onPress}
          disclosure
          expanded={false}
          accessibilityLabel="Expand archived lists"
          isLast
        />,
      );
    });

    const expectedState = { disabled: false, expanded: false };
    const row = (renderer!.root as QueryableTestInstance)
      .findAll(
        (node) =>
          node.props.accessibilityLabel === "Expand archived lists" &&
          (node.props.accessibilityState as { disabled?: boolean } | undefined)
            ?.disabled === false,
      )
      .at(0)!;
    expect(row.props.accessibilityState).toEqual(expectedState);

    act(() => (row.props.onPress as () => void)());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps native switch semantics in the toggle row", () => {
    const onValueChange = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <SettingsToggleRow
          title="Restock reminders"
          value
          onValueChange={onValueChange}
          accessibilityLabel="Restock reminders"
          isLast
        />,
      );
    });

    const toggle = renderer!.root.findByProps({
      accessibilityLabel: "Restock reminders",
    });
    expect(toggle.props.value).toBe(true);
    expect(toggle.props.accessibilityLabel).toBe("Restock reminders");

    act(() => (toggle.props.onValueChange as (value: boolean) => void)(false));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it("uses radio semantics for a selected sheet choice", () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <SettingsChoiceRow
          label="18:00"
          selected
          onPress={jest.fn()}
          isLast
        />,
      );
    });

    const expectedState = { disabled: false, selected: true };
    const row = (renderer!.root as QueryableTestInstance)
      .findAll(
        (node) =>
          node.props.accessibilityLabel === "18:00" &&
          (node.props.accessibilityState as { disabled?: boolean } | undefined)
            ?.disabled === false,
      )
      .at(0)!;
    expect(row.props.accessibilityRole).toBe("radio");
    expect(row.props.accessibilityState).toEqual(expectedState);
  });
});
