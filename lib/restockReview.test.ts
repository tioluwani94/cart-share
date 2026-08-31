import { partitionRestockCandidates } from "./restockReview";

describe("partitionRestockCandidates", () => {
  const milk = {
    householdProductId: "product_1",
    displayName: "Milk",
    isAdded: false,
  };
  const bread = {
    householdProductId: "product_2",
    displayName: "Bread",
    isAdded: true,
  };

  it("separates actionable suggestions from products already in the Next shop", () => {
    expect(
      partitionRestockCandidates([milk, bread], new Set<string>()),
    ).toEqual({
      actionableCandidates: [milk],
      alreadyAddedCandidates: [bread],
    });
  });

  it("keeps optimistic decisions out of both visible groups", () => {
    expect(
      partitionRestockCandidates(
        [milk, bread],
        new Set([milk.householdProductId, bread.householdProductId]),
      ),
    ).toEqual({
      actionableCandidates: [],
      alreadyAddedCandidates: [],
    });
  });
});
