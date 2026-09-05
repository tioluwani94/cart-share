import {
  createAnalytics,
  getDaysUntilShopBucket,
  getItemCountBucket,
} from "./analytics";

describe("analytics", () => {
  it("groups shopping-list sizes without exposing an exact count", () => {
    expect(getItemCountBucket(0)).toBe("0");
    expect(getItemCountBucket(1)).toBe("1-10");
    expect(getItemCountBucket(10)).toBe("1-10");
    expect(getItemCountBucket(11)).toBe("11+");
  });

  it("groups planned-shop lead time without exposing an exact date", () => {
    const now = Date.UTC(2026, 8, 5, 12);
    expect(getDaysUntilShopBucket(now + 2 * 86_400_000, now)).toBe("0-3");
    expect(getDaysUntilShopBucket(now + 6 * 86_400_000, now)).toBe("4-7");
    expect(getDaysUntilShopBucket(now + 9 * 86_400_000, now)).toBe("8+");
  });

  it("does not identify or capture product events before explicit consent", () => {
    const adapter = {
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      optIn: jest.fn(),
      optOut: jest.fn(),
    };
    const analytics = createAnalytics(adapter);

    analytics.identify("user_1", "household_1");
    analytics.track("activation started", {
      market: "GB",
      platform: "ios",
      app_version: "1.0.0",
    });

    expect(adapter.identify).not.toHaveBeenCalled();
    expect(adapter.capture).not.toHaveBeenCalled();
  });

  it("captures only allow-listed properties after consent", () => {
    const adapter = {
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      optIn: jest.fn(),
      optOut: jest.fn(),
    };
    const analytics = createAnalytics(adapter);
    analytics.setConsent("granted");
    analytics.identify("user_1", "household_1");
    analytics.track("shop completed", {
      household_id: "household_1",
      item_count_bucket: "11-20",
      total_present: true,
      receipt_present: false,
    });

    expect(adapter.optIn).toHaveBeenCalledTimes(1);
    expect(adapter.identify).toHaveBeenCalledWith("user_1", {
      household_id: "household_1",
    });
    expect(adapter.capture).toHaveBeenCalledTimes(1);
  });

  it("rejects accidental exact financial data at the analytics seam", () => {
    const analytics = createAnalytics({
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      optIn: jest.fn(),
      optOut: jest.fn(),
    });

    expect(() =>
      (
        analytics.track as (
          event: "shop completed",
          properties: Record<string, unknown>,
        ) => void
      )("shop completed", {
        item_count_bucket: "1-10",
        total_present: true,
        receipt_present: true,
        exact_total_pence: 4567,
      }),
    ).toThrow("prohibited properties: exact_total_pence");
  });

  it("accepts the privacy-reviewed closed-beta journey events", () => {
    const adapter = {
      capture: jest.fn(),
      identify: jest.fn(),
      reset: jest.fn(),
      optIn: jest.fn(),
      optOut: jest.fn(),
    };
    const analytics = createAnalytics(adapter);
    analytics.setConsent("granted");

    analytics.track("shopping list created", {
      household_id: "household_1",
      source: "plan",
    });
    analytics.track("shop planned", {
      household_id: "household_1",
      days_until_shop_bucket: "4-7",
    });
    analytics.track("tab viewed", {
      household_id: "household_1",
      tab: "pantry",
    });

    expect(adapter.capture).toHaveBeenCalledTimes(3);
  });
});
