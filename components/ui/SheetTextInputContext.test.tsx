import React, { forwardRef } from "react";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";
import { TextInput, type TextInputProps } from "react-native";

import { Input } from "./Input";
import { SheetTextInputProvider } from "./SheetTextInputContext";

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );

  return {
    __esModule: true,
    default: { View },
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

describe("sheet-aware Input", () => {
  it("uses the sheet-provided keyboard-aware text field and preserves callbacks", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const SheetTextInput = forwardRef<TextInput, TextInputProps>(
      function MockSheetTextInput(props, ref) {
        return (
          <TextInput
            {...props}
            ref={ref}
            testID="sheet-keyboard-aware-input"
          />
        );
      },
    );
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <SheetTextInputProvider value={SheetTextInput}>
          <Input label="Unit" onFocus={onFocus} onBlur={onBlur} />
        </SheetTextInputProvider>,
      );
    });

    const input = renderer!.root.findByProps({
      testID: "sheet-keyboard-aware-input",
    });
    const inputProps = input.props as TextInputProps;

    act(() => inputProps.onFocus?.({ nativeEvent: {} } as never));
    act(() => inputProps.onBlur?.({ nativeEvent: {} } as never));

    expect(inputProps.accessibilityLabel).toBe("Unit");
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
