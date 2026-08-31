import { getButtonLayout } from "./buttonLayout";

describe("button layout", () => {
  it.each([
    ["sm", 48, 16],
    ["md", 48, 24],
    ["lg", 52, 32],
  ] as const)(
    "gives a %s text button a fixed minimum touch height and horizontal padding",
    (size, minHeight, paddingHorizontal) => {
      const layout = getButtonLayout({ size, iconOnly: false });

      expect(layout.fixedStyle).toEqual(
        expect.objectContaining({ minHeight, paddingHorizontal }),
      );
    },
  );

  it("makes a small icon-only action an exact 48pt circle", () => {
    const layout = getButtonLayout({ size: "sm", iconOnly: true });

    expect(layout.fixedStyle).toEqual(
      expect.objectContaining({
        width: 48,
        height: 48,
        minHeight: 48,
        borderRadius: 24,
        paddingHorizontal: 0,
        paddingVertical: 0,
      }),
    );
  });
});
