import {
  getHeaderCollapseProgress,
  getScrollChromeOpacity,
  HEADER_COLLAPSE_END,
  HEADER_COLLAPSE_START,
} from "./collapsibleHeader";

describe("collapsible header geometry", () => {
  it("keeps the large title expanded through overscroll and the initial edge", () => {
    expect(getHeaderCollapseProgress(-40)).toBe(0);
    expect(getHeaderCollapseProgress(HEADER_COLLAPSE_START)).toBe(0);
  });

  it("progresses continuously before clamping at the compact title", () => {
    const midpoint =
      HEADER_COLLAPSE_START +
      (HEADER_COLLAPSE_END - HEADER_COLLAPSE_START) / 2;

    expect(getHeaderCollapseProgress(midpoint)).toBe(0.5);
    expect(getHeaderCollapseProgress(HEADER_COLLAPSE_END)).toBe(1);
    expect(getHeaderCollapseProgress(HEADER_COLLAPSE_END + 100)).toBe(1);
  });

  it("materialises scroll chrome quickly without reacting to pull-down", () => {
    expect(getScrollChromeOpacity(-20)).toBe(0);
    expect(getScrollChromeOpacity(0)).toBe(0);
    expect(getScrollChromeOpacity(8)).toBe(0.5);
    expect(getScrollChromeOpacity(16)).toBe(1);
    expect(getScrollChromeOpacity(100)).toBe(1);
  });
});
