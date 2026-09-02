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
