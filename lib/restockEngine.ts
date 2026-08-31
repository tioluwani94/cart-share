export const DAY_MS = 24 * 60 * 60 * 1000;

export interface RestockProduct {
  id: string;
  displayName: string;
  status: "active" | "paused";
  cadenceDays: number;
  lastPurchasedAt?: number;
  activatedAt: number;
  reviewAfter?: number;
  purchaseObservationCount: number;
}

export interface RestockCandidate {
  productId: string;
  displayName: string;
  cadenceDays: number;
  expectedDueAt: number;
  reviewAt: number;
  purchaseObservationCount: number;
}

interface CalculateRestockReviewInput {
  products: RestockProduct[];
  nextShopAt?: number;
  shoppingCadenceDays?: number;
  now: number;
}

export type RestockDecision =
  | "add"
  | "still_have_some"
  | "not_this_time"
  | "stop_tracking";

export interface RestockDecisionResult {
  addToShop: boolean;
  productChanges: {
    cadenceDays?: number;
    reviewAfter?: number;
    status?: RestockProduct["status"];
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getRestockTiming(product: RestockProduct): {
  expectedDueAt: number;
  reviewAt: number;
} {
  const expectedDueAt =
    (product.lastPurchasedAt ?? product.activatedAt) +
    product.cadenceDays * DAY_MS;
  const derivedReviewAt =
    expectedDueAt - clamp(product.cadenceDays * 0.2, 1, 3) * DAY_MS;
  return {
    expectedDueAt,
    reviewAt: product.reviewAfter ?? derivedReviewAt,
  };
}

export function calculateRestockReview({
  products,
  nextShopAt,
  shoppingCadenceDays,
  now,
}: CalculateRestockReviewInput): RestockCandidate[] {
  const reviewWindowEnd =
    (nextShopAt ?? now + Math.min(shoppingCadenceDays ?? 7, 7) * DAY_MS) +
    DAY_MS;

  const candidates = products.flatMap((product) => {
    if (product.status !== "active") return [];

    const { expectedDueAt, reviewAt } = getRestockTiming(product);

    if (reviewAt > now || expectedDueAt > reviewWindowEnd) return [];

    return [
      {
        productId: product.id,
        displayName: product.displayName,
        cadenceDays: product.cadenceDays,
        expectedDueAt,
        reviewAt,
        purchaseObservationCount: product.purchaseObservationCount,
      },
    ];
  });

  return candidates.sort(
    (left, right) =>
      left.expectedDueAt - right.expectedDueAt ||
      right.purchaseObservationCount - left.purchaseObservationCount ||
      left.displayName.localeCompare(right.displayName, "en-GB"),
  );
}

export function applyRestockDecision({
  product,
  decision,
  nextShopAt,
  now,
}: {
  product: RestockProduct;
  decision: RestockDecision;
  nextShopAt?: number;
  now: number;
}): RestockDecisionResult {
  if (decision === "still_have_some") {
    const delayDays = clamp(product.cadenceDays * 0.25, 2, 7);
    return {
      addToShop: false,
      productChanges: {
        cadenceDays: Math.min(180, Math.round(product.cadenceDays * 1.1)),
        reviewAfter: now + delayDays * DAY_MS,
      },
    };
  }

  if (decision === "not_this_time") {
    return {
      addToShop: false,
      productChanges: {
        reviewAfter: (nextShopAt ?? now) + DAY_MS,
      },
    };
  }

  if (decision === "add") {
    return {
      addToShop: true,
      productChanges: { reviewAfter: (nextShopAt ?? now) + DAY_MS },
    };
  }

  return {
    addToShop: false,
    productChanges: { status: "paused" },
  };
}

export interface PurchaseLearningResult {
  cadenceDays: number;
  lastPurchasedAt: number;
  purchaseObservationCount: number;
  reviewAfter: undefined;
}

export function learnFromPurchase({
  product,
  purchasedAt,
}: {
  product: RestockProduct;
  purchasedAt: number;
}): PurchaseLearningResult {
  const observedIntervalDays = product.lastPurchasedAt
    ? clamp((purchasedAt - product.lastPurchasedAt) / DAY_MS, 1, 180)
    : undefined;
  const cadenceDays =
    observedIntervalDays === undefined
      ? product.cadenceDays
      : Math.round(product.cadenceDays * 0.7 + observedIntervalDays * 0.3);

  return {
    cadenceDays,
    lastPurchasedAt: purchasedAt,
    purchaseObservationCount: product.purchaseObservationCount + 1,
    reviewAfter: undefined,
  };
}
