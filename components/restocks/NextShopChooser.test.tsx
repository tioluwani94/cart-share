import type { Id } from "@/convex/_generated/dataModel";
import React, { type ReactNode } from "react";
import type { PressableProps } from "react-native";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import {
  getNextShopChoiceHeight,
  NextShopChooser,
} from "./NextShopChooser";

jest.mock("@/components/ui", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    Button: ({
      children,
      ...props
    }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>
        {typeof children === "string" ? <Text>{children}</Text> : children}
      </Pressable>
    ),
  };
});

jest.mock("lucide-react-native", () => {
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

jest.mock("@shopify/flash-list", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    FlashList: ({
      data,
      ItemSeparatorComponent,
      renderItem,
    }: {
      data: unknown[];
      ItemSeparatorComponent?: React.ComponentType;
      renderItem: (info: { item: unknown; index: number }) => ReactNode;
    }) => (
      <View>
        {data.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && ItemSeparatorComponent ? (
              <ItemSeparatorComponent />
            ) : null}
            {renderItem({ item, index })}
          </React.Fragment>
        ))}
      </View>
    ),
  };
});

describe("NextShopChooser", () => {
  const listId = "list_1" as Id<"lists">;

  it("expands list choices for 200% Dynamic Type", () => {
    expect(getNextShopChoiceHeight(1)).toBe(72);
    expect(getNextShopChoiceHeight(2)).toBe(160);
  });

  it("offers existing lists as a Next shop as well as creating one", () => {
    const onChoose = jest.fn();
    const onCreate = jest.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <NextShopChooser
          existingLists={[
            { _id: listId, name: "Weekly shop", totalItems: 6 },
          ]}
          isOnline
          onChoose={onChoose}
          onCreate={onCreate}
        />,
      );
    });

    act(() => {
      const existingChoice = renderer.root.findByProps({
        accessibilityLabel: "Use Weekly shop as Next shop",
      });
      const createChoice = renderer.root.findByProps({
        accessibilityLabel: "Create a new Next shop",
      });
      (existingChoice.props as { onPress: () => void }).onPress();
      (createChoice.props as { onPress: () => void }).onPress();
    });

    expect(onChoose).toHaveBeenCalledWith(listId);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("does not pretend an existing list can be selected while offline", () => {
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <NextShopChooser
          existingLists={[
            { _id: listId, name: "Weekly shop", totalItems: 6 },
          ]}
          isOnline={false}
          onChoose={jest.fn()}
          onCreate={jest.fn()}
        />,
      );
    });

    const choice = renderer.root.findByProps({
      accessibilityLabel: "Reconnect to use Weekly shop as Next shop",
    });
    expect(choice.props.disabled).toBe(true);
    const create = renderer.root.findByProps({
      accessibilityLabel: "Reconnect to create a new Next shop",
    });
    expect(create.props.disabled).toBe(true);
    expect(
      renderer.root.findByProps({
        children: "Reconnect to choose or create a Next shop",
      }),
    ).toBeTruthy();
  });
});
