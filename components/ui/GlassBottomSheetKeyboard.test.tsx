import React from "react";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Keyboard } from "react-native";

import { AmountInput } from "./AmountInput";
import {
  GlassBottomSheet,
  GlassBottomSheetScrollView,
  GlassBottomSheetView,
} from "./GlassBottomSheet";
import { Input } from "./Input";

jest.mock("@gorhom/bottom-sheet", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const { TextInput: MockTextInput, View: MockView } = jest.requireActual<
    typeof import("react-native")
  >("react-native");

  return {
    BottomSheetBackdrop: MockView,
    BottomSheetModal: mockReact.forwardRef(
      (
        { children }: { children?: React.ReactNode },
        _ref: React.ForwardedRef<unknown>,
      ) => (
        <MockView>{children}</MockView>
      ),
    ),
    BottomSheetScrollView: (props: React.ComponentProps<typeof MockView>) => (
      <MockView {...props} testID="mock-bottom-sheet-scroll-view" />
    ),
    BottomSheetTextInput: mockReact.forwardRef(
      (
        props: React.ComponentProps<typeof MockTextInput>,
        _ref: React.ForwardedRef<unknown>,
      ) => (
        <MockTextInput
          {...props}
          testID="gorhom-bottom-sheet-text-input"
        />
      ),
    ),
    BottomSheetView: MockView,
    useBottomSheetSpringConfigs: () => ({}),
  };
});

jest.mock("expo-blur", () => {
  const { View: MockView } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return { BlurView: MockView };
});

jest.mock("react-native-reanimated", () => {
  const { View: MockView } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );
  return {
    __esModule: true,
    default: { View: MockView },
    ReduceMotion: { System: "system" },
    Easing: { bezier: () => jest.fn() },
    interpolate: (_value: number, _input: number[], output: number[]) =>
      output[0],
    interpolateColor: (
      _value: number,
      _input: number[],
      output: string[],
    ) => output[0],
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (initialValue: number) => ({
      current: initialValue,
      get() {
        return this.current;
      },
      set(nextValue: number) {
        this.current = nextValue;
      },
    }),
    withTiming: (value: number) => value,
  };
});

jest.mock("./useReduceTransparency", () => ({
  useReduceTransparency: () => false,
}));

describe("GlassBottomSheet keyboard handling", () => {
  it("automatically registers shared inputs with Gorhom keyboard handling", () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <GlassBottomSheet>
          <GlassBottomSheetView>
            <Input label="Budget" />
          </GlassBottomSheetView>
        </GlassBottomSheet>,
      );
    });

    expect(
      renderer!.root.findByProps({
        testID: "gorhom-bottom-sheet-text-input",
      }),
    ).toBeDefined();
  });

  it("keeps amount inputs keyboard-aware inside a sheet", () => {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <GlassBottomSheet>
          <GlassBottomSheetView>
            <AmountInput
              label="Budget"
              value="400"
              onChangeText={jest.fn()}
            />
          </GlassBottomSheetView>
        </GlassBottomSheet>,
      );
    });

    const input = renderer!.root.findByProps({
      testID: "gorhom-bottom-sheet-text-input",
    });

    expect(input.props.keyboardType).toBe("decimal-pad");
    expect(input.props.value).toBe("400");
  });

  it("gives every scrolling sheet tap-through and drag-to-dismiss defaults", () => {
    const dismissSpy = jest
      .spyOn(Keyboard, "dismiss")
      .mockImplementation(jest.fn());
    const onScrollBeginDrag = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <GlassBottomSheet>
          <GlassBottomSheetScrollView
            testID="keyboard-safe-sheet-scroll"
            onScrollBeginDrag={onScrollBeginDrag}
          >
            <Input label="Name" />
          </GlassBottomSheetScrollView>
        </GlassBottomSheet>,
      );
    });

    const scrollView = renderer!.root.findByProps({
      testID: "mock-bottom-sheet-scroll-view",
    });
    const scrollProps = scrollView.props as {
      keyboardDismissMode?: string;
      keyboardShouldPersistTaps?: string;
      onScrollBeginDrag?: (event: { nativeEvent: object }) => void;
    };

    expect(scrollProps.keyboardDismissMode).toBe("on-drag");
    expect(scrollProps.keyboardShouldPersistTaps).toBe("handled");

    act(() => scrollProps.onScrollBeginDrag?.({ nativeEvent: {} }));

    expect(dismissSpy).toHaveBeenCalledTimes(1);
    expect(onScrollBeginDrag).toHaveBeenCalledTimes(1);
    dismissSpy.mockRestore();
  });
});
