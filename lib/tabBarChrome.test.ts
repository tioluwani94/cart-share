import {
  getNextTabBarMode,
  getTabBarDockHeight,
  getTabBarGeometry,
  getTabBarIconTranslateY,
  getTabBarSegmentGeometry,
  TAB_BAR_COMPACT_EXTRA_INSET,
  TAB_BAR_COMPACT_HEIGHT,
  TAB_BAR_EXPANDED_HEIGHT,
  TAB_BAR_OUTER_MARGIN,
} from "./tabBarChrome";

describe("floating tab bar chrome", () => {
  it("keeps all four segment centres aligned through collapse", () => {
    for (const viewport of [320, 390, 430]) {
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const geometry = getTabBarGeometry(viewport, progress);
        const segments = [0, 1, 2, 3].map((index) =>
          getTabBarSegmentGeometry(viewport, progress, index),
        );
        segments.forEach((segment, index) => {
          expect(segment.center).toBeCloseTo(segment.left + segment.width / 2);
          expect(segment.top + segment.height / 2).toBe(
            TAB_BAR_EXPANDED_HEIGHT / 2,
          );
          if (index)
            expect(segment.left).toBeCloseTo(
              segments[index - 1].left + segment.width,
            );
        });
        expect(segments[0].left).toBeCloseTo(
          (viewport - geometry.visualWidth) / 2 + 4,
        );
        expect(segments[3].left + segments[3].width).toBeCloseTo(
          (viewport + geometry.visualWidth) / 2 - 4,
        );
      }
    }
    expect(
      [0, 1, 2, 3].map(
        (index) => getTabBarSegmentGeometry(390, 1, index).center,
      ),
    ).toEqual([95.25, 161.75, 228.25, 294.75]);
    expect(getTabBarSegmentGeometry(390, 1.1, 0)).toEqual(
      getTabBarSegmentGeometry(390, 1, 0),
    );
  });
  it("expands near the top and ignores pull-to-refresh overscroll", () => {
    expect(
      getNextTabBarMode({
        currentMode: 1,
        maxOffsetY: 800,
        offsetY: -32,
        previousOffsetY: 80,
      }),
    ).toBe(0);
    expect(
      getNextTabBarMode({
        currentMode: 1,
        maxOffsetY: 800,
        offsetY: 20,
        previousOffsetY: 80,
      }),
    ).toBe(0);
  });

  it("compacts only after meaningful downward travel", () => {
    expect(
      getNextTabBarMode({
        currentMode: 0,
        maxOffsetY: 800,
        offsetY: 101,
        previousOffsetY: 99,
      }),
    ).toBe(0);
    expect(
      getNextTabBarMode({
        currentMode: 0,
        maxOffsetY: 800,
        offsetY: 104,
        previousOffsetY: 99,
      }),
    ).toBe(1);
  });

  it("expands on meaningful upward travel and ignores bottom bounce", () => {
    expect(
      getNextTabBarMode({
        currentMode: 1,
        maxOffsetY: 800,
        offsetY: 394,
        previousOffsetY: 400,
      }),
    ).toBe(0);
    expect(
      getNextTabBarMode({
        currentMode: 1,
        maxOffsetY: 800,
        offsetY: 824,
        previousOffsetY: 800,
      }),
    ).toBe(1);
  });

  it("keeps a stable footprint while the visual material becomes smaller", () => {
    const width = 390;
    const expanded = getTabBarGeometry(width, 0);
    const compact = getTabBarGeometry(width, 1);

    expect(TAB_BAR_OUTER_MARGIN).toBe(24);
    expect(expanded.footprintWidth).toBe(width);
    expect(compact.footprintWidth).toBe(width);
    expect(expanded.visualWidth).toBe(width - TAB_BAR_OUTER_MARGIN * 2);
    expect(compact.visualWidth).toBe(
      expanded.visualWidth - TAB_BAR_COMPACT_EXTRA_INSET * 2,
    );
    expect(expanded.visualHeight).toBe(TAB_BAR_EXPANDED_HEIGHT);
    expect(compact.visualHeight).toBe(TAB_BAR_COMPACT_HEIGHT);
    expect(compact.minimumTouchHeight).toBeGreaterThanOrEqual(44);
  });

  it("centres icons vertically when compact labels disappear", () => {
    expect(getTabBarIconTranslateY(0)).toBe(0);
    expect(getTabBarIconTranslateY(1)).toBe(8);
  });

  it("adds a docked composer to the protected footer footprint", () => {
    expect(getTabBarDockHeight(86)).toBe(86);
    expect(getTabBarDockHeight(86, 72)).toBe(158);
    expect(getTabBarDockHeight(86, -12)).toBe(86);
  });
});
