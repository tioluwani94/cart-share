import {
  findNodeHandle,
  Keyboard,
  TextInput,
  type GestureResponderEvent,
} from "react-native";

/**
 * Shared keyboard behavior for every scrollable surface in the app.
 * A drag always gives the screen back to the user, while taps on controls
 * continue to work when the keyboard is visible.
 */
export const keyboardDismissScrollProps = {
  keyboardDismissMode: "on-drag" as const,
  keyboardShouldPersistTaps: "handled" as const,
  onScrollBeginDrag: () => Keyboard.dismiss(),
};

export const dismissKeyboard = () => Keyboard.dismiss();

const inputAccessories = new Map<number, () => TextInput | null>();

/** A field's own visibility/clear control is part of editing, not an outside tap. */
export function registerInputAccessory(
  target: number,
  getInput: () => TextInput | null,
) {
  inputAccessories.set(target, getInput);
  return () => { inputAccessories.delete(target); };
}

export function isOutsideFocusedInput(
  focusedHandle: number | null,
  touchTarget: string | number | null,
): boolean {
  return (
    focusedHandle !== null && String(focusedHandle) !== String(touchTarget)
  );
}

/**
 * Observe touches without claiming the responder. This lets buttons work on
 * the first tap while still dismissing an already-focused field. A tap inside
 * that same native input is ignored so editing never flickers or loses focus.
 */
export function dismissKeyboardForOutsideTouch(
  event: GestureResponderEvent,
): boolean {
  const focusedInput = TextInput.State.currentlyFocusedInput?.();
  if (!focusedInput) return false;
  const accessoryInput = inputAccessories.get(Number(event.nativeEvent.target))?.();
  if (accessoryInput && accessoryInput === focusedInput) return false;

  const focusedHandle = findNodeHandle(
    focusedInput as unknown as Parameters<typeof findNodeHandle>[0],
  );
  if (isOutsideFocusedInput(focusedHandle, event.nativeEvent.target)) {
    Keyboard.dismiss();
  }

  // Observe in the capture phase without stealing the touch from its target.
  return false;
}
