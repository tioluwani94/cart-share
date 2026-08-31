import { getButtonMaterial } from "./buttonMaterial";

describe("button material", () => {
  it("uses native Liquid Glass for a primary action when iOS supports it", () => {
    expect(
      getButtonMaterial({
        variant: "primary",
        reduceTransparency: false,
        onGlassSurface: false,
        nativeGlassAvailable: true,
      }),
    ).toEqual(
      expect.objectContaining({
        nativeGlass: {
          effect: "clear",
          tintColor: "rgba(174, 50, 50, 0.86)",
        },
        containerClassName: "bg-transparent",
        textClassName: "text-white",
      }),
    );
  });

  it("uses an explicit solid material when an action needs guaranteed contrast", () => {
    expect(
      getButtonMaterial({
        variant: "primary",
        reduceTransparency: false,
        onGlassSurface: false,
        nativeGlassAvailable: true,
        forceSolid: true,
      }),
    ).toEqual(
      expect.objectContaining({
        nativeGlass: null,
        blurIntensity: 0,
        containerClassName: "bg-coral",
        textClassName: "text-white",
      }),
    );
  });

  it("keeps primary actions strongly tinted and legible", () => {
    expect(
      getButtonMaterial({
        variant: "primary",
        reduceTransparency: false,
        onGlassSurface: false,
      }),
    ).toEqual(
      expect.objectContaining({
        blurIntensity: 0,
        containerClassName: "bg-coral",
        textClassName: "text-white",
        spinnerColor: "#FFFFFF",
      }),
    );
  });

  it("uses a thin glass material for tonal actions on ordinary content", () => {
    expect(
      getButtonMaterial({
        variant: "tonal",
        reduceTransparency: false,
        onGlassSurface: false,
      }),
    ).toEqual(
      expect.objectContaining({
        blurIntensity: 42,
        blurTint: "systemThinMaterialLight",
        containerClassName: "border border-white/80 bg-white/40",
        textClassName: "text-coral",
      }),
    );
  });

  it("uses clear native Liquid Glass for a tonal action when available", () => {
    expect(
      getButtonMaterial({
        variant: "tonal",
        reduceTransparency: false,
        onGlassSurface: false,
        nativeGlassAvailable: true,
      }).nativeGlass,
    ).toEqual({
      effect: "clear",
      tintColor: "rgba(201, 74, 74, 0.14)",
    });
  });

  it("uses the teal brand tint for a secondary native glass action", () => {
    expect(
      getButtonMaterial({
        variant: "secondary",
        reduceTransparency: false,
        onGlassSurface: false,
        nativeGlassAvailable: true,
      }).nativeGlass,
    ).toEqual({
      effect: "clear",
      tintColor: "rgba(23, 100, 95, 0.86)",
    });
  });

  it("uses clear neutral native glass for an outline action", () => {
    expect(
      getButtonMaterial({
        variant: "outline",
        reduceTransparency: false,
        onGlassSurface: false,
        nativeGlassAvailable: true,
      }).nativeGlass,
    ).toEqual({
      effect: "clear",
      tintColor: "rgba(255, 255, 255, 0.2)",
    });
  });

  it("does not stack blur when a button is already on a glass surface", () => {
    expect(
      getButtonMaterial({
        variant: "outline",
        reduceTransparency: false,
        onGlassSurface: true,
        nativeGlassAvailable: true,
      }),
    ).toEqual(
      expect.objectContaining({
        blurIntensity: 0,
        nativeGlass: null,
        containerClassName: "border border-coral/50 bg-surface",
      }),
    );
  });

  it("uses solid fallbacks when transparency is reduced", () => {
    expect(
      getButtonMaterial({
        variant: "tonal",
        reduceTransparency: true,
        onGlassSurface: false,
        nativeGlassAvailable: true,
      }),
    ).toEqual(
      expect.objectContaining({
        blurIntensity: 0,
        nativeGlass: null,
        containerClassName: "border border-separator bg-coral-soft",
        highlightColor: "transparent",
      }),
    );
  });

  it("keeps destructive and authentication actions semantically distinct", () => {
    expect(
      getButtonMaterial({
        variant: "danger",
        reduceTransparency: false,
        onGlassSurface: false,
      }).containerClassName,
    ).toContain("bg-red-700");
    expect(
      getButtonMaterial({
        variant: "dark",
        reduceTransparency: false,
        onGlassSurface: false,
      }).containerClassName,
    ).toContain("bg-warm-gray-900");
  });

  it("keeps danger and authentication actions distinct in native glass", () => {
    const base = {
      reduceTransparency: false,
      onGlassSurface: false,
      nativeGlassAvailable: true,
    };

    expect(getButtonMaterial({ ...base, variant: "danger" }).nativeGlass).toEqual({
      effect: "clear",
      tintColor: "rgba(148, 23, 15, 0.88)",
    });
    expect(getButtonMaterial({ ...base, variant: "dark" }).nativeGlass).toEqual({
      effect: "clear",
      tintColor: "rgba(26, 25, 23, 0.82)",
    });
  });
});
