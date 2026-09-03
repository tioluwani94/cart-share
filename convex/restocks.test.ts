import type { Id } from "./_generated/dataModel";
import {
  backfillProductMemory,
  decide,
  getReview,
  listProducts,
  updateProduct,
} from "./restocks";

type DecideHandler = (
  ctx: unknown,
  args: {
    householdProductId: Id<"householdProducts">;
    decision: "add";
    operationId: string;
    expectedActiveListId?: Id<"lists">;
  },
) => Promise<unknown>;

const decideRestock = (decide as unknown as { _handler: DecideHandler })
  ._handler;

type UpdateProductHandler = (
  ctx: unknown,
  args: {
    householdProductId: Id<"householdProducts">;
    displayName?: string;
    category?: string | null;
    defaultQuantity?: number | null;
    defaultUnit?: string | null;
    cadenceDays?: number;
    status?: "active" | "paused";
  },
) => Promise<unknown>;

const updateTrackedProduct = (
  updateProduct as unknown as { _handler: UpdateProductHandler }
)._handler;

type ListProductsHandler = (
  ctx: unknown,
  args: Record<string, never>,
) => Promise<unknown>;

const listTrackedProducts = (
  listProducts as unknown as { _handler: ListProductsHandler }
)._handler;

type GetReviewHandler = (
  ctx: unknown,
  args: Record<string, never>,
) => Promise<{
  learningProductCount: number;
  possibleRegularCount: number;
  trackedProductCount: number;
}>;

const getRestockReview = (
  getReview as unknown as { _handler: GetReviewHandler }
)._handler;

type BackfillProductMemoryHandler = (
  ctx: unknown,
  args: { cursor?: string; batchSize?: number },
) => Promise<{
  isDone: boolean;
  continueCursor: string;
  sessionsScanned: number;
  observationsCreated: number;
  productsCreated: number;
}>;

const runProductMemoryBackfill = (
  backfillProductMemory as unknown as {
    _handler: BackfillProductMemoryHandler;
  }
)._handler;

describe("restocks.backfillProductMemory", () => {
  it("creates one learning observation for duplicate completed lines in a historical shop", async () => {
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const duplicateItemId = "item_2" as Id<"items">;
    const productId = "product_1" as Id<"householdProducts">;
    const sessionId = "session_1" as Id<"shoppingSessions">;
    const purchasedAt = Date.UTC(2026, 7, 10, 12);
    const insert = jest.fn(async (table: string) => {
      if (table === "householdProducts") return productId;
      return `${table}_1`;
    });
    const patch = jest.fn(async () => undefined);
    const ctx = {
      db: {
        get: async (id: string) => {
          if (id === listId) return { _id: listId, householdId };
          if (id === householdId) {
            return { _id: householdId, shoppingCadenceDays: 7 };
          }
          return null;
        },
        insert,
        patch,
        query: (table: string) => ({
          order: () => ({
            paginate: async () => ({
              page: [
                {
                  _id: sessionId,
                  householdId,
                  listId,
                  sessionDate: purchasedAt,
                },
              ],
              continueCursor: "",
              isDone: true,
            }),
          }),
          withIndex: () => ({
            unique: async () => null,
            collect: async () =>
              table === "items"
                ? [
                    {
                      _id: itemId,
                      listId,
                      name: "Whole Milk",
                      isCompleted: true,
                    },
                    {
                      _id: duplicateItemId,
                      listId,
                      name: " whole   milk ",
                      isCompleted: true,
                    },
                  ]
                : [],
          }),
        }),
      },
    };

    await expect(runProductMemoryBackfill(ctx, {})).resolves.toEqual({
      isDone: true,
      continueCursor: "",
      sessionsScanned: 1,
      observationsCreated: 1,
      productsCreated: 1,
    });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledWith(
      "productPurchaseObservations",
      expect.objectContaining({
        householdProductId: productId,
        shoppingSessionId: sessionId,
      }),
    );
    expect(patch).toHaveBeenCalledWith(
      itemId,
      expect.objectContaining({ householdProductId: productId }),
    );
    expect(patch).toHaveBeenCalledWith(
      duplicateItemId,
      expect.objectContaining({ householdProductId: productId }),
    );
  });
});

describe("restocks.getReview", () => {
  it("tells Plan when a deferred household has no tracked products", async () => {
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const userId = "user_1" as Id<"users">;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async (id: string) => {
          if (id === householdId) {
            return {
              _id: householdId,
              activeListId: listId,
              restockSetupCompletedAt: 1,
            };
          }
          if (id === listId) {
            return { _id: listId, name: "Weekly shop", isArchived: false };
          }
          return null;
        },
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "users" ? { _id: userId } : null),
            first: async () =>
              table === "householdMembers" ? { householdId, userId } : null,
            collect: async () => [],
          }),
        }),
      },
    };

    await expect(getRestockReview(ctx, {})).resolves.toEqual(
      expect.objectContaining({ trackedProductCount: 0 }),
    );
  });

  it("does not treat paused products as an unfinished activation", async () => {
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const userId = "user_1" as Id<"users">;
    let productQueryCount = 0;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async (id: string) => {
          if (id === householdId) {
            return {
              _id: householdId,
              activeListId: listId,
              restockSetupCompletedAt: 1,
            };
          }
          if (id === listId) {
            return { _id: listId, name: "Weekly shop", isArchived: false };
          }
          return null;
        },
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "users" ? { _id: userId } : null),
            first: async () =>
              table === "householdMembers" ? { householdId, userId } : null,
            collect: async () => {
              if (table !== "householdProducts") return [];
              productQueryCount += 1;
              return productQueryCount === 1
                ? []
                : [
                    {
                      _id: "product_1",
                      displayName: "Milk",
                      status: "paused",
                    },
                  ];
            },
          }),
        }),
      },
    };

    await expect(getRestockReview(ctx, {})).resolves.toEqual(
      expect.objectContaining({ trackedProductCount: 1 }),
    );
  });

  it("reports possible regulars separately from explicitly tracked products", async () => {
    const householdId = "household_1" as Id<"households">;
    const userId = "user_1" as Id<"users">;
    let productQueryCount = 0;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async (id: string) =>
          id === householdId
            ? { _id: householdId, restockSetupCompletedAt: 1 }
            : null,
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "users" ? { _id: userId } : null),
            first: async () =>
              table === "householdMembers" ? { householdId, userId } : null,
            collect: async () => {
              if (table !== "householdProducts") return [];
              productQueryCount += 1;
              return productQueryCount === 3
                ? [
                    {
                      _id: "product_1",
                      status: "learning",
                      purchaseObservationCount: 2,
                    },
                    {
                      _id: "product_2",
                      status: "learning",
                      purchaseObservationCount: 1,
                    },
                  ]
                : [];
            },
          }),
        }),
      },
    };

    await expect(getRestockReview(ctx, {})).resolves.toEqual(
      expect.objectContaining({
        learningProductCount: 2,
        possibleRegularCount: 1,
        trackedProductCount: 0,
      }),
    );
  });
});

describe("restocks.decide", () => {
  it("rejects a caller who is not a member of the product household", async () => {
    const householdProductId = "product_1" as Id<"householdProducts">;
    const householdId = "household_1" as Id<"households">;
    const userId = "user_1" as Id<"users">;
    const insert = jest.fn();
    const patch = jest.fn();

    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async () => ({
          _id: householdProductId,
          householdId,
          displayName: "Milk",
          status: "active",
          cadenceDays: 7,
          purchaseObservationCount: 2,
          createdAt: 1,
          updatedAt: 1,
        }),
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "users" ? { _id: userId } : null),
          }),
        }),
        insert,
        patch,
      },
    };

    await expect(
      decideRestock(ctx, {
        householdProductId,
        decision: "add",
        operationId: "operation_1",
      }),
    ).rejects.toThrow("You do not have access to this household product");
    expect(insert).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("does not add to a different Next shop during offline replay", async () => {
    const householdProductId = "product_1" as Id<"householdProducts">;
    const householdId = "household_1" as Id<"households">;
    const intendedListId = "list_1" as Id<"lists">;
    const currentListId = "list_2" as Id<"lists">;
    const userId = "user_1" as Id<"users">;
    const insert = jest.fn();
    const patch = jest.fn();
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async (id: string) => {
          if (id === householdProductId) {
            return {
              _id: householdProductId,
              householdId,
              displayName: "Milk",
              normalizedName: "milk",
              status: "active",
              cadenceDays: 7,
              purchaseObservationCount: 1,
              recentOperationIds: [],
              createdAt: 1,
              updatedAt: 1,
            };
          }
          if (id === householdId) {
            return { _id: householdId, activeListId: currentListId };
          }
          if (id === currentListId) {
            return { _id: currentListId, householdId, isArchived: false };
          }
          return null;
        },
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users" ? { _id: userId } : { householdId, userId },
          }),
        }),
        insert,
        patch,
      },
    };

    await expect(
      decideRestock(ctx, {
        householdProductId,
        decision: "add",
        operationId: "operation_1",
        expectedActiveListId: intendedListId,
      }),
    ).resolves.toEqual({
      applied: false,
      conflict: "active_list_changed",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("replays an add decision without duplicating the active-list item", async () => {
    const householdProductId = "product_1" as Id<"householdProducts">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const userId = "user_1" as Id<"users">;
    const product = {
      _id: householdProductId,
      householdId,
      displayName: "Milk",
      normalizedName: "milk",
      status: "active" as const,
      cadenceDays: 7,
      purchaseObservationCount: 2,
      recentOperationIds: [] as string[],
      createdAt: 1,
      updatedAt: 1,
    };
    const household = { _id: householdId, activeListId: listId };
    const items: {
      _id: Id<"items">;
      name: string;
      isCompleted: boolean;
      householdProductId?: Id<"householdProducts">;
    }[] = [{ _id: itemId, name: "  MILK ", isCompleted: false }];
    const insert = jest.fn(async (table: string, value: never) => {
      if (table === "items") {
        items.push({
          _id: itemId,
          ...(value as object),
        } as (typeof items)[number]);
      }
      return itemId;
    });
    const patch = jest.fn(async (id: string, changes: object) => {
      if (id === householdProductId) Object.assign(product, changes);
      if (id === itemId) Object.assign(items[0], changes);
    });

    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async (id: string) => {
          if (id === householdProductId) return product;
          if (id === householdId) return household;
          if (id === listId) {
            return { _id: listId, householdId, isArchived: false };
          }
          return null;
        },
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: userId }
                : table === "householdMembers"
                  ? { householdId, userId }
                  : null,
            collect: async () => (table === "items" ? items : []),
          }),
        }),
        insert,
        patch,
      },
    };

    const args = {
      householdProductId,
      decision: "add" as const,
      operationId: "operation_1",
      expectedActiveListId: listId,
    };

    await expect(decideRestock(ctx, args)).resolves.toEqual(
      expect.objectContaining({ itemId }),
    );
    await expect(decideRestock(ctx, args)).resolves.toEqual(
      expect.objectContaining({ itemId }),
    );
    expect(insert).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith(
      itemId,
      expect.objectContaining({ householdProductId }),
    );
  });
});

describe("restocks.listProducts", () => {
  it("returns active and paused household products in a predictable order", async () => {
    const householdId = "household_1" as Id<"households">;
    const userId = "user_1" as Id<"users">;
    const activeProduct = {
      _id: "product_2" as Id<"householdProducts">,
      displayName: "Milk",
      normalizedName: "milk",
      householdId,
      cadenceDays: 7,
      purchaseObservationCount: 2,
      status: "active" as const,
      createdBy: userId,
      createdAt: 1,
      updatedAt: 1,
    };
    const pausedProduct = {
      _id: "product_1" as Id<"householdProducts">,
      displayName: "Bread",
      normalizedName: "bread",
      householdId,
      cadenceDays: 14,
      purchaseObservationCount: 1,
      status: "paused" as const,
      createdBy: userId,
      createdAt: 1,
      updatedAt: 1,
    };
    let productQueryCount = 0;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "users" ? { _id: userId } : null),
            first: async () =>
              table === "householdMembers" ? { householdId, userId } : null,
            collect: async () => {
              if (table !== "householdProducts") return [];
              productQueryCount += 1;
              if (productQueryCount === 1) return [activeProduct];
              if (productQueryCount === 2) return [pausedProduct];
              return [];
            },
          }),
        }),
      },
    };

    await expect(listTrackedProducts(ctx, {})).resolves.toEqual([
      expect.objectContaining({ displayName: "Milk", status: "active" }),
      expect.objectContaining({ displayName: "Bread", status: "paused" }),
    ]);
  });

  it("rejects a signed-in user without a household membership", async () => {
    const userId = "user_1" as Id<"users">;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "users" ? { _id: userId } : null),
            first: async () => null,
          }),
        }),
      },
    };

    await expect(listTrackedProducts(ctx, {})).rejects.toThrow(
      "You do not belong to a household",
    );
  });
});

describe("restocks.updateProduct", () => {
  it("patches only fields the household explicitly changed", async () => {
    const householdProductId = "product_1" as Id<"householdProducts">;
    const householdId = "household_1" as Id<"households">;
    const userId = "user_1" as Id<"users">;
    const patch = jest.fn(async (_id: string, _changes: object) => undefined);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async () => ({ _id: householdProductId, householdId }),
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users" ? { _id: userId } : { householdId, userId },
          }),
        }),
        patch,
      },
    };

    await updateTrackedProduct(ctx, {
      householdProductId,
      status: "paused",
    });

    expect(patch).toHaveBeenCalledWith(
      householdProductId,
      expect.objectContaining({ status: "paused" }),
    );
    expect(patch.mock.calls[0][1]).not.toHaveProperty("displayName");
    expect(patch.mock.calls[0][1]).not.toHaveProperty("defaultQuantity");
  });

  it("clears optional product details when the household removes them", async () => {
    const householdProductId = "product_1" as Id<"householdProducts">;
    const householdId = "household_1" as Id<"households">;
    const userId = "user_1" as Id<"users">;
    const patch = jest.fn(async (_id: string, _changes: object) => undefined);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async () => ({ _id: householdProductId, householdId }),
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users" ? { _id: userId } : { householdId, userId },
          }),
        }),
        patch,
      },
    };

    await updateTrackedProduct(ctx, {
      householdProductId,
      category: null,
      defaultQuantity: null,
      defaultUnit: null,
    });

    expect(patch).toHaveBeenCalledWith(
      householdProductId,
      expect.objectContaining({
        category: undefined,
        defaultQuantity: undefined,
        defaultUnit: undefined,
      }),
    );
  });
});
