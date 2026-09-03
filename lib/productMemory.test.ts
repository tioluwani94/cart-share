import { DAY_MS } from "./restockEngine";
import { observeProductPurchase } from "./productMemory";

describe("observeProductPurchase", () => {
  it("starts learning from the first completed-shop purchase without enabling reminders", () => {
    const purchasedAt = Date.UTC(2026, 8, 3, 12);

    expect(
      observeProductPurchase({
        displayName: "  Whole Milk  ",
        fallbackCadenceDays: 7,
        product: null,
        purchasedAt,
      }),
    ).toEqual({
      becamePossibleRegular: false,
      changes: {
        cadenceDays: 7,
        displayName: "Whole Milk",
        lastPurchasedAt: purchasedAt,
        normalizedName: "whole milk",
        purchaseObservationCount: 1,
        reviewAfter: undefined,
        status: "learning",
      },
    });
  });

  it("recognizes a possible regular on its second distinct shop", () => {
    const firstPurchase = Date.UTC(2026, 7, 20, 12);
    const secondPurchase = Date.UTC(2026, 8, 3, 12);

    expect(
      observeProductPurchase({
        displayName: "Whole Milk",
        fallbackCadenceDays: 7,
        product: {
          cadenceDays: 7,
          displayName: "Whole Milk",
          lastPurchasedAt: firstPurchase,
          normalizedName: "whole milk",
          purchaseObservationCount: 1,
          status: "learning",
        },
        purchasedAt: secondPurchase,
      }),
    ).toEqual({
      becamePossibleRegular: true,
      changes: {
        cadenceDays: 14,
        displayName: "Whole Milk",
        lastPurchasedAt: secondPurchase,
        normalizedName: "whole milk",
        purchaseObservationCount: 2,
        reviewAfter: undefined,
        status: "learning",
      },
    });
  });

  it("does not move the cadence or latest purchase backwards for an older offline observation", () => {
    const latestPurchase = Date.UTC(2026, 8, 3, 12);
    const result = observeProductPurchase({
      displayName: "Milk",
      fallbackCadenceDays: 7,
      purchasedAt: latestPurchase - 7 * DAY_MS,
      product: {
        displayName: "Milk",
        normalizedName: "milk",
        cadenceDays: 14,
        lastPurchasedAt: latestPurchase,
        purchaseObservationCount: 2,
        status: "active",
      },
    });

    expect(result.changes).toEqual(
      expect.objectContaining({
        cadenceDays: 14,
        lastPurchasedAt: latestPurchase,
        purchaseObservationCount: 3,
      }),
    );
  });
});
