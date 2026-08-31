import { createAnalytics } from "./analytics";

describe("analytics", () => {
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
});
