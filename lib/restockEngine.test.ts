import {
  applyRestockDecision,
  calculateRestockReview,
  DAY_MS,
  learnFromPurchase,
} from "./restockEngine";

describe("calculateRestockReview", () => {
  it("shows a product that will be due by the next planned shop", () => {
    const now = Date.UTC(2026, 7, 31, 12);

    const candidates = calculateRestockReview({
      now,
      nextShopAt: now + 2 * DAY_MS,
      shoppingCadenceDays: 7,
      products: [
        {
          id: "milk",
          displayName: "Milk",
          status: "active",
          cadenceDays: 7,
          lastPurchasedAt: now - 6 * DAY_MS,
          activatedAt: now - 30 * DAY_MS,
          purchaseObservationCount: 3,
        },
      ],
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        productId: "milk",
        cadenceDays: 7,
        expectedDueAt: now + DAY_MS,
      }),
    ]);
  });

  it("sorts candidates by urgency, evidence, then name", () => {
    const now = Date.UTC(2026, 7, 31, 12);
    const product = (
      id: string,
      daysSincePurchase: number,
      purchaseObservationCount: number,
    ) => ({
      id,
      displayName: id,
      status: "active" as const,
      cadenceDays: 7,
      lastPurchasedAt: now - daysSincePurchase * DAY_MS,
      activatedAt: now - 30 * DAY_MS,
      purchaseObservationCount,
    });

    const candidates = calculateRestockReview({
      now,
      nextShopAt: now + DAY_MS,
      shoppingCadenceDays: 7,
      products: [
        product("Yoghurt", 7, 5),
        product("Bread", 8, 2),
        product("Apples", 7, 5),
      ],
    });

    expect(candidates.map((candidate) => candidate.productId)).toEqual([
      "Bread",
      "Apples",
      "Yoghurt",
    ]);
  });
});

describe("learnFromPurchase", () => {
  it("uses a weighted observed interval and clears postponement after purchase", () => {
    const purchasedAt = Date.UTC(2026, 7, 31, 12);

    const result = learnFromPurchase({
      purchasedAt,
      product: {
        id: "rice",
        displayName: "Rice",
        status: "active",
        cadenceDays: 10,
        lastPurchasedAt: purchasedAt - 20 * DAY_MS,
        activatedAt: purchasedAt - 60 * DAY_MS,
        reviewAfter: purchasedAt + 2 * DAY_MS,
        purchaseObservationCount: 2,
      },
    });

    expect(result).toEqual({
      cadenceDays: 13,
      lastPurchasedAt: purchasedAt,
      purchaseObservationCount: 3,
      reviewAfter: undefined,
    });
  });
});

describe("applyRestockDecision", () => {
  it("postpones and gently lengthens cadence when the household still has some", () => {
    const now = Date.UTC(2026, 7, 31, 12);

    const result = applyRestockDecision({
      now,
      nextShopAt: now + 3 * DAY_MS,
      decision: "still_have_some",
      product: {
        id: "milk",
        displayName: "Milk",
        status: "active",
        cadenceDays: 20,
        activatedAt: now - 30 * DAY_MS,
        purchaseObservationCount: 2,
      },
    });

    expect(result).toEqual({
      addToShop: false,
      productChanges: {
        cadenceDays: 22,
        reviewAfter: now + 5 * DAY_MS,
      },
    });
  });

  it("delays review until after the planned shop without changing cadence", () => {
    const now = Date.UTC(2026, 7, 31, 12);
    const nextShopAt = now + 3 * DAY_MS;

    const result = applyRestockDecision({
      now,
      nextShopAt,
      decision: "not_this_time",
      product: {
        id: "bread",
        displayName: "Bread",
        status: "active",
        cadenceDays: 7,
        activatedAt: now - 30 * DAY_MS,
        purchaseObservationCount: 4,
      },
    });

    expect(result).toEqual({
      addToShop: false,
      productChanges: { reviewAfter: nextShopAt + DAY_MS },
    });
  });

  it("marks an add decision for duplicate-safe list insertion", () => {
    const now = Date.UTC(2026, 7, 31, 12);
    const result = applyRestockDecision({
      now,
      decision: "add",
      product: {
        id: "pasta",
        displayName: "Pasta",
        status: "active",
        cadenceDays: 21,
        activatedAt: now - 30 * DAY_MS,
        purchaseObservationCount: 1,
      },
    });

    expect(result).toEqual({
      addToShop: true,
      productChanges: { reviewAfter: now + DAY_MS },
    });
  });

  it("pauses tracking without deleting purchase history", () => {
    const now = Date.UTC(2026, 7, 31, 12);
    const result = applyRestockDecision({
      now,
      decision: "stop_tracking",
      product: {
        id: "coffee",
        displayName: "Coffee",
        status: "active",
        cadenceDays: 30,
        lastPurchasedAt: now - 28 * DAY_MS,
        activatedAt: now - 90 * DAY_MS,
        purchaseObservationCount: 3,
      },
    });

    expect(result).toEqual({
      addToShop: false,
      productChanges: { status: "paused" },
    });
  });
});
