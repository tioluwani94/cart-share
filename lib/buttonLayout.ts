import type { ViewStyle } from "react-native";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonLayout {
  containerClassName: string;
  fixedStyle?: ViewStyle;
}

const regularSizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-[48px] px-4",
  md: "min-h-[48px] px-6",
  lg: "min-h-[52px] px-8",
};

const iconDiameter: Record<ButtonSize, number> = {
  sm: 48,
  md: 48,
  lg: 52,
};

export function getButtonLayout({
  size,
  iconOnly,
}: {
  size: ButtonSize;
  iconOnly: boolean;
}): ButtonLayout {
  if (!iconOnly) {
    return { containerClassName: regularSizeStyles[size] };
  }

  const diameter = iconDiameter[size];

  return {
    containerClassName: "p-0",
    fixedStyle: {
      width: diameter,
      height: diameter,
      minHeight: diameter,
      borderRadius: diameter / 2,
      paddingHorizontal: 0,
      paddingVertical: 0,
      flexShrink: 0,
    },
  };
}
