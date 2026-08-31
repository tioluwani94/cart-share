import type { Id } from "./_generated/dataModel";
import { completeOffline, create } from "./sessions";

type CreateSessionHandler = (
  ctx: unknown,
  args: {
    householdId: Id<"households">;
    listId?: Id<"lists">;
    totalAmount?: number;
    storeName?: string;
    paidBy?: "joint" | Id<"users">;
    sessionDate?: number;
  },
) => Promise<{ sessionId: Id<"shoppingSessions"> }>;

const createSession = (
  create as unknown as { _handler: CreateSessionHandler }
)._handler;

type CompleteOfflineHandler = (
  ctx: unknown,
  args: {
    householdId: Id<"households">;
    listId: Id<"lists">;
    operationId: string;
    sessionDate: number;
    items: {
      itemId?: Id<"items">;
      clientId?: string;
      isCompleted: boolean;
    }[];
  },
) => Promise<{
  sessionId: Id<"shoppingSessions">;
  alreadyCompleted: boolean;
}>;

const completeOfflineShop = (
  completeOffline as unknown as { _handler: CompleteOfflineHandler }
)._handler;

describe("sessions.create", () => {
  it("links the session to the completed list and archives it after saving", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const sessionId = "session_1" as Id<"shoppingSessions">;
    const insert = jest.fn(async () => sessionId);
    const patch = jest.fn(async () => undefined);
    const query = jest.fn((table: string) => ({
      withIndex: () => ({
        unique: async () =>
          table === "users"
            ? { _id: userId, clerkId: "clerk_1" }
            : { householdId, userId },
        collect: async () => [],
      }),
    }));

    const ctx = {
      auth: {
        getUserIdentity: async () => ({ subject: "clerk_1" }),
      },
      db: {
        query,
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId, isArchived: false }
            : id === householdId
              ? { _id: householdId, activeListId: listId }
              : id === sessionId
                ? {
                    _id: sessionId,
                    householdId,
                    listId,
                    sessionDate: Date.UTC(2026, 7, 31, 12),
                  }
              : null,
        insert,
        patch,
      },
    };

    const result = await createSession(ctx, {
      householdId,
      listId,
      totalAmount: 4567,
      storeName: "  Tesco Extra  ",
      paidBy: "joint",
    });

    expect(result).toEqual({ sessionId });
    expect(insert).toHaveBeenCalledWith(
      "shoppingSessions",
      expect.objectContaining({
        householdId,
        listId,
        totalAmount: 4567,
        storeName: "Tesco Extra",
        paidBy: "joint",
      }),
    );
    expect(patch).toHaveBeenCalledWith(
      listId,
      expect.objectContaining({ isArchived: true }),
    );
    expect(patch).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({ activeListId: undefined }),
    );
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      patch.mock.invocationCallOrder[0],
    );
  });

  it("does not create another session for an already completed list", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const insert = jest.fn(async () => "session_2" as Id<"shoppingSessions">);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: userId, clerkId: "clerk_1" }
                : { householdId, userId },
            collect: async () => [],
          }),
        }),
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId, isArchived: true }
            : null,
        insert,
        patch: jest.fn(),
      },
    };

    await expect(
      createSession(ctx, { householdId, listId }),
    ).rejects.toThrow("List has already been completed");
    expect(insert).not.toHaveBeenCalled();
  });

  it("learns only from completed tracked products after the session is saved", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const productId = "product_1" as Id<"householdProducts">;
    const pausedProductId = "product_2" as Id<"householdProducts">;
    const sessionId = "session_1" as Id<"shoppingSessions">;
    const purchasedAt = Date.UTC(2026, 7, 31, 12);
    const insert = jest.fn(async () => sessionId);
    const patch = jest.fn(async (_id: string, _changes: object) => undefined);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users" ? { _id: userId } : { householdId, userId },
            collect: async () =>
              table === "items"
                ? [
                    {
                      _id: "item_1" as Id<"items">,
                      listId,
                      householdProductId: productId,
                      isCompleted: true,
                    },
                    {
                      _id: "item_2" as Id<"items">,
                      listId,
                      householdProductId: pausedProductId,
                      isCompleted: true,
                    },
                  ]
                : [],
          }),
        }),
        get: async (id: string) => {
          if (id === listId) return { _id: listId, householdId };
          if (id === householdId) {
            return { _id: householdId, activeListId: listId };
          }
          if (id === sessionId) {
            return { _id: sessionId, householdId, listId, sessionDate: purchasedAt };
          }
          if (id === productId) {
            return {
              _id: productId,
              householdId,
              displayName: "Milk",
              status: "active" as const,
              cadenceDays: 10,
              lastPurchasedAt: purchasedAt - 20 * 24 * 60 * 60 * 1000,
              purchaseObservationCount: 2,
              createdAt: purchasedAt - 60 * 24 * 60 * 60 * 1000,
            };
          }
          if (id === pausedProductId) {
            return {
              _id: pausedProductId,
              householdId,
              displayName: "Tea",
              status: "paused" as const,
              cadenceDays: 14,
              purchaseObservationCount: 2,
              createdAt: purchasedAt - 60 * 24 * 60 * 60 * 1000,
            };
          }
          return null;
        },
        insert,
        patch,
      },
    };

    await createSession(ctx, {
      householdId,
      listId,
      sessionDate: purchasedAt,
    } as Parameters<CreateSessionHandler>[1]);

    expect(patch).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({
        cadenceDays: 13,
        lastPurchasedAt: purchasedAt,
        purchaseObservationCount: 3,
      }),
    );
    expect(patch).not.toHaveBeenCalledWith(
      pausedProductId,
      expect.anything(),
    );
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      patch.mock.invocationCallOrder[0],
    );
  });
});

describe("sessions.completeOffline", () => {
  it("applies the captured item state and completes the list atomically", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const sessionId = "session_1" as Id<"shoppingSessions">;
    const item = {
      _id: itemId,
      listId,
      isCompleted: false,
    };
    const insert = jest.fn(async () => sessionId);
    const patch = jest.fn(async (id: string, changes: object) => {
      if (id === itemId) Object.assign(item, changes);
    });
    const query = jest.fn((table: string) => ({
      withIndex: () => ({
        unique: async () =>
          table === "users"
            ? { _id: userId, clerkId: "clerk_1" }
            : table === "householdMembers"
              ? { householdId, userId }
              : null,
        first: async () => null,
        collect: async () =>
          table === "items" ? [item].filter((entry) => entry.isCompleted) : [],
      }),
    }));
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query,
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId, isArchived: false }
            : id === householdId
              ? { _id: householdId, activeListId: listId }
              : id === itemId
                ? item
                : id === sessionId
                  ? {
                      _id: sessionId,
                      householdId,
                      listId,
                      sessionDate: Date.UTC(2026, 7, 31, 12),
                    }
                : null,
        insert,
        patch,
      },
    };

    const result = await completeOfflineShop(ctx, {
      householdId,
      listId,
      operationId: "shop_completion_1",
      sessionDate: Date.UTC(2026, 7, 31, 12),
      items: [{ itemId, isCompleted: true }],
    });

    expect(result).toEqual({ sessionId, alreadyCompleted: false });
    expect(patch).toHaveBeenCalledWith(
      itemId,
      expect.objectContaining({ isCompleted: true, completedBy: userId }),
    );
    expect(insert).toHaveBeenCalledWith(
      "shoppingSessions",
      expect.objectContaining({
        householdId,
        listId,
        completionOperationId: "shop_completion_1",
      }),
    );
    expect(patch).toHaveBeenCalledWith(
      listId,
      expect.objectContaining({ isArchived: true }),
    );
    expect(patch).toHaveBeenCalledWith(
      householdId,
      expect.objectContaining({ activeListId: undefined }),
    );
  });

  it("learns only from completed products present in the offline snapshot", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const remoteItemId = "item_2" as Id<"items">;
    const productId = "product_1" as Id<"householdProducts">;
    const remoteProductId = "product_2" as Id<"householdProducts">;
    const sessionId = "session_1" as Id<"shoppingSessions">;
    const purchasedAt = Date.UTC(2026, 7, 31, 12);
    const item = {
      _id: itemId,
      listId,
      householdProductId: productId,
      isCompleted: false,
    };
    const remoteItem = {
      _id: remoteItemId,
      listId,
      householdProductId: remoteProductId,
      isCompleted: true,
    };
    const product = {
      _id: productId,
      householdId,
      displayName: "Milk",
      status: "active" as const,
      cadenceDays: 7,
      purchaseObservationCount: 0,
      createdAt: purchasedAt - 7 * 24 * 60 * 60 * 1000,
    };
    const remoteProduct = {
      ...product,
      _id: remoteProductId,
      displayName: "Bread",
    };
    const patch = jest.fn(async (id: string, changes: object) => {
      if (id === itemId) Object.assign(item, changes);
      if (id === remoteItemId) Object.assign(remoteItem, changes);
    });
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: userId, clerkId: "clerk_1" }
                : table === "householdMembers"
                  ? { householdId, userId }
                  : null,
            first: async () => null,
            collect: async () =>
              table === "items"
                ? [item, remoteItem].filter((entry) => entry.isCompleted)
                : [],
          }),
        }),
        get: async (id: string) => {
          if (id === listId) return { _id: listId, householdId };
          if (id === householdId) {
            return { _id: householdId, activeListId: listId };
          }
          if (id === itemId) return item;
          if (id === sessionId) {
            return { _id: sessionId, householdId, listId, sessionDate: purchasedAt };
          }
          if (id === productId) return product;
          if (id === remoteProductId) return remoteProduct;
          return null;
        },
        insert: jest.fn(async () => sessionId),
        patch,
      },
    };

    await completeOfflineShop(ctx, {
      householdId,
      listId,
      operationId: "shop_completion_1",
      sessionDate: purchasedAt,
      items: [{ itemId, isCompleted: true }],
    });

    expect(patch).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ lastPurchasedAt: purchasedAt }),
    );
    expect(patch).not.toHaveBeenCalledWith(
      remoteProductId,
      expect.anything(),
    );
  });

  it("returns the existing session when the same list completion is retried", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const sessionId = "session_1" as Id<"shoppingSessions">;
    const insert = jest.fn();
    const patch = jest.fn();
    const usedIndexes: string[] = [];
    const completionIndexValues: [string, unknown][] = [];
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: (
            indexName: string,
            configure: (query: {
              eq: (field: string, value: unknown) => unknown;
            }) => unknown,
          ) => {
            usedIndexes.push(indexName);
            const queryBuilder = {
              eq(field: string, value: unknown) {
                if (indexName === "by_list_and_completion_operation") {
                  completionIndexValues.push([field, value]);
                }
                return queryBuilder;
              },
            };
            configure(queryBuilder);
            return {
            unique: async () =>
              table === "users"
                ? { _id: userId, clerkId: "clerk_1" }
                : table === "householdMembers"
                  ? { householdId, userId }
                  : {
                      _id: sessionId,
                      householdId,
                      listId,
                      completionOperationId: "shop_completion_1",
                    },
            first: async () =>
              table === "shoppingSessions"
                ? {
                    _id: sessionId,
                    householdId,
                    listId,
                    completionOperationId: "shop_completion_1",
                  }
                : null,
            collect: async () => [],
            };
          },
        }),
        get: async (id: string) =>
          id === listId ? { _id: listId, householdId } : null,
        insert,
        patch,
      },
    };

    const result = await completeOfflineShop(ctx, {
      householdId,
      listId,
      operationId: "shop_completion_1",
      sessionDate: Date.UTC(2026, 7, 31, 12),
      items: [],
    });

    expect(result).toEqual({ sessionId, alreadyCompleted: true });
    expect(usedIndexes).toContain("by_list_and_completion_operation");
    expect(completionIndexValues).toEqual([
      ["listId", listId],
      ["completionOperationId", "shop_completion_1"],
    ]);
    expect(insert).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("rejects a different completion operation after the list is archived", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const insert = jest.fn();
    const patch = jest.fn();
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: userId, clerkId: "clerk_1" }
                : table === "householdMembers"
                  ? { householdId, userId }
                  : null,
            collect: async () => [],
          }),
        }),
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId, isArchived: true }
            : null,
        insert,
        patch,
      },
    };

    await expect(
      completeOfflineShop(ctx, {
        householdId,
        listId,
        operationId: "shop_completion_2",
        sessionDate: Date.UTC(2026, 8, 7, 12),
        items: [],
      }),
    ).rejects.toThrow("List has already been completed");

    expect(insert).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("creates another session when a reused list has a different operation ID", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const historicalSessionId = "session_1" as Id<"shoppingSessions">;
    const newSessionId = "session_2" as Id<"shoppingSessions">;
    const insert = jest.fn(async () => newSessionId);
    const patch = jest.fn(async () => undefined);
    let queriedOperationId: unknown;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: (
            _indexName: string,
            configure: (query: {
              eq: (field: string, value: unknown) => unknown;
            }) => unknown,
          ) => {
            const queryBuilder = {
              eq(field: string, value: unknown) {
                if (field === "completionOperationId") {
                  queriedOperationId = value;
                }
                return queryBuilder;
              },
            };
            configure(queryBuilder);
            return {
              unique: async () =>
                table === "users"
                  ? { _id: userId, clerkId: "clerk_1" }
                  : table === "householdMembers"
                    ? { householdId, userId }
                    : queriedOperationId === "shop_completion_1"
                      ? {
                          _id: historicalSessionId,
                          householdId,
                          listId,
                          completionOperationId: "shop_completion_1",
                        }
                      : null,
              collect: async () => [],
            };
          },
        }),
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId, isArchived: false }
            : id === householdId
              ? { _id: householdId, activeListId: listId }
              : id === newSessionId
                ? {
                    _id: newSessionId,
                    householdId,
                    listId,
                    sessionDate: Date.UTC(2026, 8, 7, 12),
                  }
                : null,
        insert,
        patch,
      },
    };

    const result = await completeOfflineShop(ctx, {
      householdId,
      listId,
      operationId: "shop_completion_2",
      sessionDate: Date.UTC(2026, 8, 7, 12),
      items: [],
    });

    expect(queriedOperationId).toBe("shop_completion_2");
    expect(result).toEqual({ sessionId: newSessionId, alreadyCompleted: false });
    expect(insert).toHaveBeenCalledWith(
      "shoppingSessions",
      expect.objectContaining({
        listId,
        completionOperationId: "shop_completion_2",
      }),
    );
  });

  it("rejects a snapshot item from another list before saving a session", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const otherListId = "list_2" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const insert = jest.fn();
    const patch = jest.fn();
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: userId, clerkId: "clerk_1" }
                : table === "householdMembers"
                  ? { householdId, userId }
                  : null,
            first: async () => null,
            collect: async () => [],
          }),
        }),
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId }
            : id === itemId
              ? { _id: itemId, listId: otherListId, isCompleted: true }
              : null,
        insert,
        patch,
      },
    };

    await expect(
      completeOfflineShop(ctx, {
        householdId,
        listId,
        operationId: "shop_completion_1",
        sessionDate: Date.UTC(2026, 7, 31, 12),
        items: [{ itemId, isCompleted: true }],
      }),
    ).rejects.toThrow("Completion item does not belong to this list");
    expect(insert).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("ignores a snapshot item deleted remotely before completion replay", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const deletedItemId = "item_deleted" as Id<"items">;
    const sessionId = "session_1" as Id<"shoppingSessions">;
    const insert = jest.fn(async () => sessionId);
    const patch = jest.fn(async () => undefined);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: userId, clerkId: "clerk_1" }
                : table === "householdMembers"
                  ? { householdId, userId }
                  : null,
            collect: async () => [],
          }),
        }),
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId, isArchived: false }
            : id === householdId
              ? { _id: householdId, activeListId: listId }
              : id === sessionId
                ? {
                    _id: sessionId,
                    householdId,
                    listId,
                    sessionDate: Date.UTC(2026, 7, 31, 12),
                  }
                : null,
        insert,
        patch,
      },
    };

    const result = await completeOfflineShop(ctx, {
      householdId,
      listId,
      operationId: "shop_completion_1",
      sessionDate: Date.UTC(2026, 7, 31, 12),
      items: [{ itemId: deletedItemId, isCompleted: true }],
    });

    expect(result).toEqual({ sessionId, alreadyCompleted: false });
    expect(insert).toHaveBeenCalledWith(
      "shoppingSessions",
      expect.objectContaining({ listId }),
    );
  });

  it("rejects duplicate snapshot references before learning or saving", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const insert = jest.fn();
    const patch = jest.fn();
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users"
                ? { _id: userId, clerkId: "clerk_1" }
                : table === "householdMembers"
                  ? { householdId, userId }
                  : null,
            collect: async () => [],
          }),
        }),
        get: async (id: string) =>
          id === listId
            ? { _id: listId, householdId }
            : id === itemId
              ? { _id: itemId, listId, isCompleted: false }
              : null,
        insert,
        patch,
      },
    };

    await expect(
      completeOfflineShop(ctx, {
        householdId,
        listId,
        operationId: "shop_completion_1",
        sessionDate: Date.UTC(2026, 7, 31, 12),
        items: [
          { itemId, isCompleted: true },
          { itemId, isCompleted: false },
        ],
      }),
    ).rejects.toThrow("Duplicate completion item reference");
    expect(insert).not.toHaveBeenCalled();
  });
});
