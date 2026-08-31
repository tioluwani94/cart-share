import { nextLocalDeliveryTime } from "./notificationSchedule";

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
