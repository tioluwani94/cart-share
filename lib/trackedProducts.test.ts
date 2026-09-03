import {
  buildTrackedProductRows,
  getLearningProductCopy,
} from "./trackedProducts";

describe("buildTrackedProductRows", () => {
  const activeMilk = {
    _id: "product_1",
    displayName: "Milk",
    status: "active" as const,
  };
  const pausedBread = {
    _id: "product_2",
    displayName: "Bread",
    status: "paused" as const,
  };
  const learningEggs = {
    _id: "product_3",
    displayName: "Eggs",
    purchaseObservationCount: 2,
    status: "learning" as const,
  };

  it("groups active products before paused products with section boundaries", () => {
    expect(buildTrackedProductRows([pausedBread, activeMilk])).toEqual([
      {
        type: "section",
        key: "section:active",
        title: "Active",
      },
      {
        type: "product",
        key: "product:product_1",
        product: activeMilk,
        paused: false,
        firstInSection: true,
        lastInSection: true,
      },
      {
        type: "section",
        key: "section:paused",
        title: "Paused",
      },
      {
        type: "product",
        key: "product:product_2",
        product: pausedBread,
        paused: true,
        firstInSection: true,
        lastInSection: true,
      },
    ]);
  });

  it("represents long product collections exactly once", () => {
    const products = Array.from({ length: 14 }, (_, index) => ({
      _id: `product_${index}`,
      displayName: `Product ${index}`,
      status: index % 4 === 0 ? ("paused" as const) : ("active" as const),
    }));

    const rows = buildTrackedProductRows(products);
    const productRows = rows.filter((row) => row.type === "product");

    expect(productRows).toHaveLength(products.length);
    expect(new Set(productRows.map((row) => row.product._id)).size).toBe(
      products.length,
    );
    expect(rows.filter((row) => row.type === "section")).toHaveLength(2);
  });

  it("omits empty sections", () => {
    expect(buildTrackedProductRows([])).toEqual([]);
    expect(buildTrackedProductRows([pausedBread])[0]).toEqual({
      type: "section",
      key: "section:paused",
      title: "Paused",
    });
  });

  it("puts possible regulars in a learning section before active products", () => {
    expect(buildTrackedProductRows([activeMilk, learningEggs])[0]).toEqual({
      type: "section",
      key: "section:learning",
      title: "Learning",
    });
  });
});

describe("getLearningProductCopy", () => {
  it("keeps a first purchase in a quiet learning state", () => {
    expect(getLearningProductCopy(1)).toEqual({
      badge: "Learning",
      detail: "Bought once · still learning",
      readyForReview: false,
    });
  });

  it("marks the second distinct shop as ready for review", () => {
    expect(getLearningProductCopy(2)).toEqual({
      badge: "Possible regular",
      detail: "Seen in 2 completed shops",
      readyForReview: true,
    });
  });
});
