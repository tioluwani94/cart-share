import {
  createContext,
  useContext,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import type { TextInput, TextInputProps } from "react-native";

export type SheetTextInputComponent = ForwardRefExoticComponent<
  TextInputProps & RefAttributes<TextInput>
>;

const SheetTextInputContext = createContext<SheetTextInputComponent | null>(
  null,
);

export const SheetTextInputProvider = SheetTextInputContext.Provider;

export function useSheetTextInput() {
  return useContext(SheetTextInputContext);
}

export type SheetInputFocusRequester = (nativeTarget: number) => void;

const SheetInputFocusContext = createContext<SheetInputFocusRequester | null>(
  null,
);

export const SheetInputFocusProvider = SheetInputFocusContext.Provider;

/** Requests that a scrolling sheet reveal a newly focused native input. */
export function useSheetInputFocusRequester() {
  return useContext(SheetInputFocusContext);
}
