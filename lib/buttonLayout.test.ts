import { getButtonLayout } from "./buttonLayout";

describe("button layout", () => {
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
