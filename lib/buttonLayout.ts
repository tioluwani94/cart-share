import type { ViewStyle } from "react-native";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonLayout {
  containerClassName: string;
  fixedStyle?: ViewStyle;
}

const regularSizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: 48, paddingHorizontal: 16 },
  md: { minHeight: 48, paddingHorizontal: 24 },
  lg: { minHeight: 52, paddingHorizontal: 32 },
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
    return {
      containerClassName: "",
      fixedStyle: regularSizeStyles[size],
    };
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
