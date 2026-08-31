import {
  canFinishShoppingList,
  summarizeShoppingList,
} from "./shoppingList";

describe("shopping list summary", () => {
  it("derives progress, planned spend, and item groups consistently", () => {
    const milk = {
      name: "Milk",
      isCompleted: false,
      estimatedPricePence: 145,
      quantity: 2,
    };
    const bread = {
      name: "Bread",
      isCompleted: true,
      estimatedPricePence: 210,
    };
    const bananas = { name: "Bananas", isCompleted: false };

    expect(summarizeShoppingList([milk, bread, bananas])).toEqual({
      uncompletedItems: [milk, bananas],
      completedItems: [bread],
      totalItems: 3,
      completedCount: 1,
      progress: 1 / 3,
      plannedTotalPence: 500,
    });
  });

  it("only allows finishing a non-empty, fully-synced online shop", () => {
    expect(
      canFinishShoppingList({
        totalItems: 0,
        isOnline: true,
        queueLength: 0,
        isFinishing: false,
      }),
    ).toBe(false);
    expect(
      canFinishShoppingList({
        totalItems: 3,
        isOnline: true,
        queueLength: 0,
        isFinishing: false,
      }),
    ).toBe(true);
    expect(
      canFinishShoppingList({
        totalItems: 3,
        isOnline: false,
        queueLength: 1,
        isFinishing: false,
      }),
    ).toBe(false);
  });
});
