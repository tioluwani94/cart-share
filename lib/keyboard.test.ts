import { Keyboard, TextInput } from "react-native";

import {
  dismissKeyboard,
  dismissKeyboardForOutsideTouch,
  registerInputAccessory,
  isOutsideFocusedInput,
  keyboardDismissScrollProps,
} from "./keyboard";

describe("keyboard behavior", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses drag dismissal without blocking handled controls", () => {
    expect(keyboardDismissScrollProps.keyboardDismissMode).toBe("on-drag");
    expect(keyboardDismissScrollProps.keyboardShouldPersistTaps).toBe(
      "handled",
    );
  });

  it("dismisses from both the scroll and direct helpers", () => {
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation();

    keyboardDismissScrollProps.onScrollBeginDrag();
    dismissKeyboard();

    expect(dismiss).toHaveBeenCalledTimes(2);
  });

  it("distinguishes the active input from every outside touch target", () => {
    expect(isOutsideFocusedInput(42, 42)).toBe(false);
    expect(isOutsideFocusedInput(42, "42")).toBe(false);
    expect(isOutsideFocusedInput(42, 84)).toBe(true);
    expect(isOutsideFocusedInput(null, 84)).toBe(false);
  });

  it("preserves editing only for the focused field's own registered accessory", () => {
    const focusedInput = { _nativeTag: 42 } as unknown as TextInput;
    const anotherInput = {} as TextInput;
    jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue(focusedInput);
    const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation();
    const unregisterOwn = registerInputAccessory(84, () => focusedInput);
    const unregisterOther = registerInputAccessory(85, () => anotherInput);
    const touch = (target: number) => dismissKeyboardForOutsideTouch({
      nativeEvent: { target },
    } as unknown as Parameters<typeof dismissKeyboardForOutsideTouch>[0]);
    expect(touch(84)).toBe(false);
    expect(dismiss).not.toHaveBeenCalled();
    touch(85);
    expect(dismiss).toHaveBeenCalledTimes(1);
    touch(99);
    expect(dismiss).toHaveBeenCalledTimes(2);
    unregisterOwn();
    touch(84);
    expect(dismiss).toHaveBeenCalledTimes(3);
    unregisterOther();
  });
});
