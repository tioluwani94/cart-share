import { Keyboard } from "react-native";

import {
  dismissKeyboard,
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
});
