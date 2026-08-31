import {
  createMarketFormatters,
  formatCurrencyFromPence,
  formatDate,
  formatFriendlyDate,
  formatMonthName,
  parseCurrencyInputToPence,
} from "./formatters";

describe("UK formatters", () => {
  it("formats integer pence as GBP", () => {
    expect(formatCurrencyFromPence(123456)).toBe("£1,234.56");
  });

  it("uses UK-friendly dates and month names", () => {
    const date = Date.UTC(2026, 0, 2, 12);

    expect(formatDate(date)).toBe("2 Jan 2026");
    expect(formatMonthName(date)).toBe("January");
  });

  it("parses editable GBP amounts into integer pence", () => {
    expect(parseCurrencyInputToPence("£1,234.56")).toBe(123456);
    expect(parseCurrencyInputToPence("not an amount")).toBeNull();
  });

  it("compares UK calendar days safely across the spring clock change", () => {
    const beforeClockChange = new Date("2026-03-29T00:30:00+00:00").getTime();
    const afterClockChange = new Date("2026-03-30T00:30:00+01:00").getTime();

    expect(formatFriendlyDate(beforeClockChange, afterClockChange)).toBe(
      "Yesterday",
    );
  });

  it("uses the household planning time zone rather than the travelling device", () => {
    const purchasedAt = new Date("2026-08-31T22:30:00Z").getTime();
    const viewedAt = new Date("2026-08-31T23:30:00Z").getTime();

    expect(
      formatFriendlyDate(purchasedAt, viewedAt, {
        timeZone: "Europe/London",
      }),
    ).toBe("Yesterday");
    expect(
      formatFriendlyDate(purchasedAt, viewedAt, {
        timeZone: "America/Los_Angeles",
      }),
    ).toBe("Today");
  });

  it("keeps non-UK market formatting behind an explicit formatter seam", () => {
    const formatter = createMarketFormatters({
      locale: "en-US",
      currency: "USD",
      timeZone: "America/New_York",
    });

    expect(formatter.money(1234)).toBe("$12.34");
    expect(formatter.date(Date.UTC(2026, 0, 2, 1))).toBe("Jan 1, 2026");
  });
});
