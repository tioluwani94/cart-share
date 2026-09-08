import {
  moveShopCalendarMonth,
  shopCalendarMonth,
  shopScheduleFields,
  shopScheduleTimestamp,
} from "./shopSchedule";

describe("shopping calendar", () => {
  it("round trips in the household zone rather than the device zone", () => {
    const timestamp = shopScheduleTimestamp(
      "2026-09-12",
      "10:30",
      "Europe/London",
    );
    expect(timestamp).toBe(Date.parse("2026-09-12T09:30:00Z"));
    expect(shopScheduleFields(timestamp!, "Europe/London")).toEqual({
      date: "2026-09-12",
      time: "10:30",
    });
    expect(
      shopScheduleTimestamp("2026-12-31", "23:45", "America/New_York"),
    ).toBe(Date.parse("2027-01-01T04:45:00Z"));
  });
  it.each([
    ["2026-02-30", "10:30"],
    ["2026-09-12", "24:00"],
    ["2026-09-12", "10:60"],
    ["2026-09-12", "noon"],
    ["2026-03-29", "01:30"],
  ])(
    "rejects invalid dates and nonexistent DST clocks: %s %s",
    (date, time) => {
      expect(shopScheduleTimestamp(date, time, "Europe/London")).toBeNull();
    },
  );
  it("handles Monday-first grids, leap years and year boundaries", () => {
    const september = shopCalendarMonth("2026-09");
    expect(september.cells[0]).toBeNull();
    expect(september.cells[1]).toBe("2026-09-01");
    expect(shopCalendarMonth("2028-02").cells.filter(Boolean)).toHaveLength(29);
    expect(moveShopCalendarMonth("2026-12", 1)).toBe("2027-01");
    expect(moveShopCalendarMonth("2027-01", -1)).toBe("2026-12");
  });
});
