export interface TrackableProduct {
  _id: string;
  status: "active" | "paused";
}

export type TrackedProductRow<T extends TrackableProduct> =
  | {
      type: "section";
      key: "section:active" | "section:paused";
      title: "Active" | "Paused";
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

  return [
    {
      type: "section",
      key: `section:${status}`,
      title: paused ? "Paused" : "Active",
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
    ...buildSection(products, "active"),
    ...buildSection(products, "paused"),
  ];
}
