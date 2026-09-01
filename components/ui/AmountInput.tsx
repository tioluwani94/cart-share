import { cn } from "@/lib/cn";
import { formatCurrencyInput } from "@/lib/formatters";
import { forwardRef, useCallback, type ComponentProps } from "react";
import { Text, TextInput, type TextStyle } from "react-native";
import { Input } from "./Input";

export type AmountInputPresentation = "field" | "prominent";

export type AmountInputProps = Omit<
  ComponentProps<typeof Input>,
  "frameClassName" | "leadingAccessory" | "onChangeText"
> & {
  currencySymbol?: string;
  onChangeText: (formattedValue: string) => void;
  presentation?: AmountInputPresentation;
};

const amountInputStyle: TextStyle = {
  fontVariant: ["tabular-nums"],
};

const prominentInputStyle: TextStyle = {
  minHeight: 80,
  fontSize: 30,
  fontWeight: "700",
  lineHeight: 36,
};

/**
 * The single controlled currency field used throughout the app.
 * It owns grouping, the visible currency prefix and the decimal keyboard.
 */
export const AmountInput = forwardRef<TextInput, AmountInputProps>(
  function AmountInput(
    {
      className,
      currencySymbol = "£",
      editable = true,
      keyboardType = "decimal-pad",
      maxLength = 16,
      onChangeText,
      presentation = "field",
      style,
      value,
      ...props
    },
    ref,
  ) {
    const handleChangeText = useCallback(
      (nextValue: string) => onChangeText(formatCurrencyInput(nextValue)),
      [onChangeText],
    );
    const isProminent = presentation === "prominent";

    return (
      <Input
        ref={ref}
        {...props}
        value={value === undefined ? undefined : formatCurrencyInput(value)}
        onChangeText={handleChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        frameClassName={isProminent ? "px-5" : "px-4"}
        leadingAccessory={
          <Text
            accessible={false}
            className={cn(
              "mr-2 font-semibold",
              isProminent
                ? "text-3xl font-heading text-ink-secondary"
                : "text-[17px] leading-[22px] text-ink-secondary",
              !editable && "text-muted",
            )}
          >
            {currencySymbol}
          </Text>
        }
        className={cn(
          "px-0",
          isProminent ? "py-0" : "py-4",
          className,
        )}
        style={
          isProminent
            ? [amountInputStyle, prominentInputStyle, style]
            : [amountInputStyle, style]
        }
      />
    );
  },
);
