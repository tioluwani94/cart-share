import { getUkMonthRange, getUkYearMonth } from "./ukCalendar";

describe("UK calendar boundaries", () => {
  it("starts and ends a BST month at London midnight", () => {
    expect(getUkMonthRange(2026, 3)).toEqual({
      start: Date.UTC(2026, 2, 31, 23),
      endExclusive: Date.UTC(2026, 3, 30, 23),
    });
  });

  it("classifies the UTC hour before April as April in the UK", () => {
    expect(getUkYearMonth(Date.UTC(2026, 2, 31, 23, 30))).toEqual({
      year: 2026,
      month: 3,
    });
  });
});
