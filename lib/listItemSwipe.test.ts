import {
  getListItemSwipePosition,
  getListItemSwipeSnapTarget,
  LIST_ITEM_SWIPE_OPEN,
} from "./listItemSwipe";

describe("list item swipe physics", () => {
  it("tracks a closed row directly through the midpoint", () => {
    expect(getListItemSwipePosition(0, -40)).toBe(-40);
    expect(getListItemSwipePosition(0, -80)).toBe(-80);
    expect(getListItemSwipePosition(0, -120)).toBe(-120);
  });

  it("continues directly from an already open row", () => {
    expect(getListItemSwipePosition(LIST_ITEM_SWIPE_OPEN, 30)).toBe(-110);
    expect(getListItemSwipePosition(LIST_ITEM_SWIPE_OPEN, 100)).toBe(-40);
  });

  it("adds gentle resistance beyond the fully revealed boundary", () => {
    const position = getListItemSwipePosition(0, -200);
    expect(position).toBeLessThan(LIST_ITEM_SWIPE_OPEN);
    expect(position).toBeGreaterThan(-150);
  });

  it("does not allow the row to drag past its resting position", () => {
    expect(getListItemSwipePosition(0, 40)).toBe(0);
  });

  it("uses both position and release velocity when settling", () => {
    expect(getListItemSwipeSnapTarget(-80, 0)).toBe(LIST_ITEM_SWIPE_OPEN);
    expect(getListItemSwipeSnapTarget(-40, 0)).toBe(0);
    expect(getListItemSwipeSnapTarget(-35, -900)).toBe(
      LIST_ITEM_SWIPE_OPEN,
    );
    expect(getListItemSwipeSnapTarget(-105, 900)).toBe(0);
  });
});
