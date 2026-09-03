export interface TrackableProduct {
  _id: string;
  status: "learning" | "active" | "paused";
}

export function getLearningProductCopy(purchaseObservationCount: number): {
  badge: "Learning" | "Possible regular";
  detail: string;
  readyForReview: boolean;
} {
  const readyForReview = purchaseObservationCount >= 2;
  return readyForReview
    ? {
        badge: "Possible regular",
        detail: `Seen in ${purchaseObservationCount} completed shops`,
        readyForReview,
      }
    : {
        badge: "Learning",
        detail: "Bought once · still learning",
        readyForReview,
      };
}

export type TrackedProductRow<T extends TrackableProduct> =
  | {
      type: "section";
      key: "section:learning" | "section:active" | "section:paused";
      title: "Learning" | "Active" | "Paused";
    }
  | {
      type: "product";
      key: string;
      product: T;
      paused: boolean;
      firstInSection: boolean;
      lastInSection: boolean;
    };

function buildSection<T extends TrackableProduct>(
  products: readonly T[],
  status: T["status"],
): TrackedProductRow<T>[] {
  const sectionProducts = products.filter(
    (product) => product.status === status,
  );
  if (sectionProducts.length === 0) return [];

  const paused = status === "paused";
  const title =
    status === "learning" ? "Learning" : paused ? "Paused" : "Active";

  return [
    {
      type: "section",
      key: `section:${status}`,
      title,
    },
    ...sectionProducts.map((product, index) => ({
      type: "product" as const,
      key: `product:${product._id}`,
      product,
      paused,
      firstInSection: index === 0,
      lastInSection: index === sectionProducts.length - 1,
    })),
  ];
}

export function buildTrackedProductRows<T extends TrackableProduct>(
  products: readonly T[],
): TrackedProductRow<T>[] {
  return [
    ...buildSection(products, "learning"),
    ...buildSection(products, "active"),
    ...buildSection(products, "paused"),
  ];
}
