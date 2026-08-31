import type { Id } from "./_generated/dataModel";
import { create } from "./sessions";

type CreateSessionHandler = (
  ctx: unknown,
  args: {
    householdId: Id<"households">;
    listId?: Id<"lists">;
    totalAmount?: number;
    sessionDate?: number;
  },
) => Promise<{ sessionId: Id<"shoppingSessions"> }>;

const createSession = (
  create as unknown as { _handler: CreateSessionHandler }
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
              : null,
        insert,
        patch,
      },
    };

    const result = await createSession(ctx, {
      householdId,
      listId,
      totalAmount: 4567,
    });

    expect(result).toEqual({ sessionId });
    expect(insert).toHaveBeenCalledWith(
      "shoppingSessions",
      expect.objectContaining({ householdId, listId, totalAmount: 4567 }),
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

  it("learns only from completed tracked products after the session is saved", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const productId = "product_1" as Id<"householdProducts">;
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
                  ]
                : [],
          }),
        }),
        get: async (id: string) => {
          if (id === listId) return { _id: listId, householdId };
          if (id === householdId) {
            return { _id: householdId, activeListId: listId };
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
    expect(insert.mock.invocationCallOrder[0]).toBeLessThan(
      patch.mock.invocationCallOrder[0],
    );
  });
});
