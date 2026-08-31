export interface GlassSheetMaterial {
  blurIntensity: number;
  tint: "systemMaterialLight";
  surfaceColor: string;
  highlightColor: string;
  borderColor: string;
  handleColor: string;
  backdropOpacity: number;
}

export function getGlassSheetMaterial({
  reduceTransparency,
}: {
  reduceTransparency: boolean;
}): GlassSheetMaterial {
  return {
    blurIntensity: reduceTransparency ? 0 : 72,
    tint: "systemMaterialLight",
    surfaceColor: reduceTransparency
      ? "#FAFAFA"
      : "rgba(250, 250, 250, 0.74)",
    highlightColor: reduceTransparency
      ? "transparent"
      : "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.72)",
    handleColor: "rgba(92, 90, 84, 0.42)",
    backdropOpacity: 0.34,
  };
}
