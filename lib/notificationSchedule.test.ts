import { nextLocalDeliveryTime, nextActivityDeliveryTime } from "./notificationSchedule";

describe("nextLocalDeliveryTime", () => {
  it("delivers at the member's saved local time across the UK daylight-saving boundary", () => {
    const notBefore = Date.parse("2026-03-29T10:00:00.000Z");

    expect(
      nextLocalDeliveryTime({
        notBefore,
        timeMinutesLocal: 18 * 60,
        timeZone: "Europe/London",
      }),
    ).toBe(Date.parse("2026-03-29T17:00:00.000Z"));
  });
});


describe("activity quiet hours", () => {
  it.each([
    ["2026-03-28T21:00:00Z", "2026-03-29T07:00:00Z"],
    ["2026-10-24T21:00:00Z", "2026-10-25T08:00:00Z"],
    ["2026-09-20T19:00:00Z", "2026-09-21T07:00:00Z"],
    ["2026-09-20T07:00:00Z", "2026-09-20T07:00:00Z"],
  ])("schedules %s at %s across quiet hours and DST", (input, expected) => {
    expect(nextActivityDeliveryTime(Date.parse(input), "Europe/London")).toBe(Date.parse(expected));
  });
});
