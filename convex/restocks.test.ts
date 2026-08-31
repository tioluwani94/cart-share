import type { Id } from "./_generated/dataModel";
import { decide, listProducts, updateProduct } from "./restocks";

type DecideHandler = (
  ctx: unknown,
  args: {
    householdProductId: Id<"householdProducts">;
    decision: "add";
    operationId: string;
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
            unique: async () =>
              table === "users" ? { _id: userId } : null,
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
        items.push({ _id: itemId, ...(value as object) } as (typeof items)[number]);
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
              return productQueryCount === 1 ? [activeProduct] : [pausedProduct];
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
