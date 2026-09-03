import { DAY_MS } from "./restockEngine";

export const POSSIBLE_REGULAR_OBSERVATION_COUNT = 2;

export type HouseholdProductStatus = "learning" | "active" | "paused";

export interface ProductMemorySnapshot {
  displayName: string;
  normalizedName: string;
  cadenceDays: number;
  lastPurchasedAt?: number;
  purchaseObservationCount: number;
  reviewAfter?: number;
  status: HouseholdProductStatus;
}

export interface PurchaseObservationResult {
  becamePossibleRegular: boolean;
  changes: ProductMemorySnapshot;
}

function clampCadenceDays(value: number): number {
  return Math.min(180, Math.max(1, Math.round(value)));
}

export function normalizeProductName(value?: string): string {
  return value?.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ") ?? "";
}

export function observeProductPurchase({
  displayName,
  fallbackCadenceDays,
  product,
  purchasedAt,
}: {
  displayName: string;
  fallbackCadenceDays: number;
  product: ProductMemorySnapshot | null;
  purchasedAt: number;
}): PurchaseObservationResult {
  const trimmedName = displayName.trim();
  if (!product) {
    return {
      becamePossibleRegular: false,
      changes: {
        cadenceDays: clampCadenceDays(fallbackCadenceDays),
        displayName: trimmedName,
        lastPurchasedAt: purchasedAt,
        normalizedName: normalizeProductName(trimmedName),
        purchaseObservationCount: 1,
        reviewAfter: undefined,
        status: "learning",
      },
    };
  }

  const nextObservationCount = product.purchaseObservationCount + 1;
  const advancesLatestPurchase =
    product.lastPurchasedAt === undefined ||
    purchasedAt > product.lastPurchasedAt;
  const observedIntervalDays =
    product.lastPurchasedAt !== undefined && advancesLatestPurchase
      ? Math.min(
          180,
          Math.max(1, (purchasedAt - product.lastPurchasedAt) / DAY_MS),
        )
      : undefined;
  const cadenceDays =
    observedIntervalDays === undefined
      ? product.cadenceDays
      : product.status === "learning" && product.purchaseObservationCount === 1
        ? clampCadenceDays(observedIntervalDays)
        : clampCadenceDays(
            product.cadenceDays * 0.7 + observedIntervalDays * 0.3,
          );

  return {
    becamePossibleRegular:
      product.status === "learning" &&
      product.purchaseObservationCount < POSSIBLE_REGULAR_OBSERVATION_COUNT &&
      nextObservationCount >= POSSIBLE_REGULAR_OBSERVATION_COUNT,
    changes: {
      ...product,
      cadenceDays,
      lastPurchasedAt: advancesLatestPurchase
        ? purchasedAt
        : product.lastPurchasedAt,
      purchaseObservationCount: nextObservationCount,
      reviewAfter: advancesLatestPurchase ? undefined : product.reviewAfter,
    },
  };
}
