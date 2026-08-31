import { themeColors } from "./theme";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tonal"
  | "outline"
  | "ghost"
  | "danger"
  | "dark";

export interface ButtonMaterial {
  nativeGlass: {
    effect: "clear" | "regular";
    tintColor: string;
  } | null;
  blurIntensity: number;
  blurTint: "systemThinMaterialLight";
  containerClassName: string;
  textClassName: string;
  spinnerColor: string;
  highlightColor: string;
}

export function getButtonMaterial({
  variant,
  reduceTransparency,
  onGlassSurface,
  nativeGlassAvailable = false,
}: {
  variant: ButtonVariant;
  reduceTransparency: boolean;
  onGlassSurface: boolean;
  nativeGlassAvailable?: boolean;
}): ButtonMaterial {
  const allowsThinGlass = !reduceTransparency && !onGlassSurface;
  const usesNativeGlass = allowsThinGlass && nativeGlassAvailable;

  switch (variant) {
    case "primary":
      if (usesNativeGlass) {
        return {
          nativeGlass: {
            effect: "clear",
            tintColor: "rgba(174, 50, 50, 0.86)",
          },
          blurIntensity: 0,
          blurTint: "systemThinMaterialLight",
          containerClassName: "bg-transparent",
          textClassName: "text-white",
          spinnerColor: themeColors.surface,
          highlightColor: "transparent",
        };
      }
      return {
        nativeGlass: null,
        blurIntensity: 0,
        blurTint: "systemThinMaterialLight",
        containerClassName: "bg-coral",
        textClassName: "text-white",
        spinnerColor: themeColors.surface,
        highlightColor: "rgba(255, 255, 255, 0.12)",
      };
    case "secondary":
      if (usesNativeGlass) {
        return {
          nativeGlass: {
            effect: "clear",
            tintColor: "rgba(23, 100, 95, 0.86)",
          },
          blurIntensity: 0,
          blurTint: "systemThinMaterialLight",
          containerClassName: "bg-transparent",
          textClassName: "text-white",
          spinnerColor: themeColors.surface,
          highlightColor: "transparent",
        };
      }
      return {
        nativeGlass: null,
        blurIntensity: 0,
        blurTint: "systemThinMaterialLight",
        containerClassName: "border border-white/30 bg-teal",
        textClassName: "text-white",
        spinnerColor: themeColors.surface,
        highlightColor: "rgba(255, 255, 255, 0.1)",
      };
    case "tonal":
      if (usesNativeGlass) {
        return {
          nativeGlass: {
            effect: "clear",
            tintColor: "rgba(201, 74, 74, 0.14)",
          },
          blurIntensity: 0,
          blurTint: "systemThinMaterialLight",
          containerClassName: "bg-transparent",
          textClassName: "text-coral",
          spinnerColor: themeColors.coral,
          highlightColor: "transparent",
        };
      }
      return allowsThinGlass
        ? {
            nativeGlass: null,
            blurIntensity: 42,
            blurTint: "systemThinMaterialLight",
            containerClassName: "border border-white/80 bg-white/40",
            textClassName: "text-coral",
            spinnerColor: themeColors.coral,
            highlightColor: "rgba(255, 255, 255, 0.1)",
          }
        : {
            nativeGlass: null,
            blurIntensity: 0,
            blurTint: "systemThinMaterialLight",
            containerClassName: "border border-separator bg-coral-soft",
            textClassName: "text-coral",
            spinnerColor: themeColors.coral,
            highlightColor: "transparent",
          };
    case "outline":
      if (usesNativeGlass) {
        return {
          nativeGlass: {
            effect: "clear",
            tintColor: "rgba(255, 255, 255, 0.2)",
          },
          blurIntensity: 0,
          blurTint: "systemThinMaterialLight",
          containerClassName: "bg-transparent",
          textClassName: "text-coral",
          spinnerColor: themeColors.coral,
          highlightColor: "transparent",
        };
      }
      return allowsThinGlass
        ? {
            nativeGlass: null,
            blurIntensity: 42,
            blurTint: "systemThinMaterialLight",
            containerClassName: "border border-coral/40 bg-white/35",
            textClassName: "text-coral",
            spinnerColor: themeColors.coral,
            highlightColor: "rgba(255, 255, 255, 0.08)",
          }
        : {
            nativeGlass: null,
            blurIntensity: 0,
            blurTint: "systemThinMaterialLight",
            containerClassName: "border border-coral/50 bg-surface",
            textClassName: "text-coral",
            spinnerColor: themeColors.coral,
            highlightColor: "transparent",
          };
    case "danger":
      if (usesNativeGlass) {
        return {
          nativeGlass: {
            effect: "clear",
            tintColor: "rgba(148, 23, 15, 0.88)",
          },
          blurIntensity: 0,
          blurTint: "systemThinMaterialLight",
          containerClassName: "bg-transparent",
          textClassName: "text-white",
          spinnerColor: themeColors.surface,
          highlightColor: "transparent",
        };
      }
      return {
        nativeGlass: null,
        blurIntensity: 0,
        blurTint: "systemThinMaterialLight",
        containerClassName: "border border-white/25 bg-red-700",
        textClassName: "text-white",
        spinnerColor: themeColors.surface,
        highlightColor: "rgba(255, 255, 255, 0.1)",
      };
    case "dark":
      if (usesNativeGlass) {
        return {
          nativeGlass: {
            effect: "clear",
            tintColor: "rgba(26, 25, 23, 0.82)",
          },
          blurIntensity: 0,
          blurTint: "systemThinMaterialLight",
          containerClassName: "bg-transparent",
          textClassName: "text-white",
          spinnerColor: themeColors.surface,
          highlightColor: "transparent",
        };
      }
      return {
        nativeGlass: null,
        blurIntensity: 0,
        blurTint: "systemThinMaterialLight",
        containerClassName: "border border-white/20 bg-warm-gray-900",
        textClassName: "text-white",
        spinnerColor: themeColors.surface,
        highlightColor: "rgba(255, 255, 255, 0.1)",
      };
    case "ghost":
      return {
        nativeGlass: null,
        blurIntensity: 0,
        blurTint: "systemThinMaterialLight",
        containerClassName: "border border-transparent bg-transparent",
        textClassName: "text-coral",
        spinnerColor: themeColors.coral,
        highlightColor: "transparent",
      };
  }
}
