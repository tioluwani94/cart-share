import { getGlassSheetMaterial } from "./bottomSheet";

describe("glass bottom sheet material", () => {
  it("uses a frosted material while transparency is allowed", () => {
    expect(getGlassSheetMaterial({ reduceTransparency: false })).toEqual(
      expect.objectContaining({
        blurIntensity: 72,
        tint: "systemMaterialLight",
        surfaceColor: "rgba(250, 250, 250, 0.74)",
        highlightColor: "rgba(255, 255, 255, 0.12)",
      }),
    );
  });

  it("uses a solid, high-contrast surface when transparency is reduced", () => {
    expect(getGlassSheetMaterial({ reduceTransparency: true })).toEqual(
      expect.objectContaining({
        blurIntensity: 0,
        surfaceColor: "#FAFAFA",
        highlightColor: "transparent",
        borderColor: "rgba(255, 255, 255, 0.72)",
      }),
    );
  });
});
