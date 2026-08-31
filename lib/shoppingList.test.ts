import {
  buildShoppingListHandoff,
  canFinishShoppingList,
  createShopCompletionSnapshot,
  getEffectiveShoppingMode,
  getShopCompletionMode,
  summarizeShoppingList,
} from "./shoppingList";
import type { Id } from "@/convex/_generated/dataModel";

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

  it("allows finishing a non-empty shop even when it must sync later", () => {
    expect(
      canFinishShoppingList({
        totalItems: 0,
        isFinishing: false,
        hasQueuedCompletion: false,
      }),
    ).toBe(false);
    expect(
      canFinishShoppingList({
        totalItems: 3,
        isFinishing: false,
        hasQueuedCompletion: false,
      }),
    ).toBe(true);
    expect(
      canFinishShoppingList({
        totalItems: 3,
        isFinishing: false,
        hasQueuedCompletion: false,
      }),
    ).toBe(true);
    expect(
      canFinishShoppingList({
        totalItems: 3,
        isFinishing: false,
        hasQueuedCompletion: true,
      }),
    ).toBe(false);
  });

  it("captures offline-created items by client ID and synced items by server ID", () => {
    expect(
      createShopCompletionSnapshot([
        {
          _id: "temp_item_local_1" as Id<"items">,
          clientId: "item_local_1",
          isCompleted: true,
        },
        {
          _id: "item_server_1" as Id<"items">,
          clientId: "item_original_client_id",
          isCompleted: false,
        },
      ]),
    ).toEqual([
      { clientId: "item_local_1", isCompleted: true },
      { itemId: "item_server_1", isCompleted: false },
    ]);
  });

  it("queues completion offline or behind earlier writes", () => {
    expect(getShopCompletionMode({ isOnline: true, queueLength: 0 })).toBe(
      "immediate",
    );
    expect(getShopCompletionMode({ isOnline: false, queueLength: 0 })).toBe(
      "queued",
    );
    expect(getShopCompletionMode({ isOnline: true, queueLength: 2 })).toBe(
      "queued",
    );
  });

  it("builds an online handoff from only the items still needed", () => {
    expect(
      buildShoppingListHandoff({
        listName: "Next shop",
        items: [
          { name: "Milk", quantity: 2, unit: "litres", isCompleted: false },
          { name: "Bananas", quantity: 6, isCompleted: false },
          { name: "Bread", isCompleted: true },
        ],
      }),
    ).toBe(
      "Next shop\n\n• Milk — 2 litres\n• Bananas — 6\n\n2 items to order",
    );
  });

  it("does not build an empty handoff when everything is picked up", () => {
    expect(
      buildShoppingListHandoff({
        listName: "Next shop",
        items: [{ name: "Bread", isCompleted: true }],
      }),
    ).toBeNull();
  });

  it("uses the household preference until a shop-specific mode is chosen", () => {
    expect(getEffectiveShoppingMode(undefined, "online")).toBe("online");
    expect(getEffectiveShoppingMode(undefined, "both")).toBe("in_store");
    expect(getEffectiveShoppingMode("online", "in_store")).toBe("online");
  });
});
