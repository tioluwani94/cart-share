import type { Id } from "./_generated/dataModel";
import { add, getByList, setCompleted, update } from "./items";

type AddItemHandler = (
  ctx: unknown,
  args: {
    listId: Id<"lists">;
    clientId?: string;
    name: string;
  },
) => Promise<{ itemId: Id<"items"> }>;

const addItem = (add as unknown as { _handler: AddItemHandler })._handler;

type SetCompletedHandler = (
  ctx: unknown,
  args: {
    listId: Id<"lists">;
    clientId: string;
    isCompleted: boolean;
  },
) => Promise<{ success: true; isCompleted: boolean }>;

const setItemCompleted = (
  setCompleted as unknown as { _handler: SetCompletedHandler }
)._handler;

type UpdateItemHandler = (
  ctx: unknown,
  args: {
    itemId: Id<"items">;
    estimatedPricePence: number | null;
  },
) => Promise<{ success: true }>;

const updateItem = (update as unknown as { _handler: UpdateItemHandler })
  ._handler;

type GetItemsHandler = (
  ctx: unknown,
  args: { listId: Id<"lists"> },
) => Promise<unknown[]>;

const getItems = (getByList as unknown as { _handler: GetItemsHandler })
  ._handler;

describe("offline item identity", () => {
  it("returns the existing item when an offline add is replayed", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const insert = jest.fn();

    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async () => ({ _id: listId, householdId }),
        insert,
        query: (table: string) => ({
          withIndex: (indexName: string) => ({
            unique: async () => {
              if (table === "users") return { _id: userId };
              if (indexName === "by_list_and_client_id") {
                return { _id: itemId, listId, clientId: "client_item_1" };
              }
              return { householdId, userId };
            },
          }),
        }),
      },
    };

    await expect(
      addItem(ctx, { listId, clientId: "client_item_1", name: "Milk" }),
    ).resolves.toEqual({ itemId });
    expect(insert).not.toHaveBeenCalled();
  });

  it("sets the intended completion state using the stable client ID", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const patch = jest.fn(async () => undefined);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async () => ({ _id: listId, householdId }),
        patch,
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => {
              if (table === "users") return { _id: userId };
              if (table === "items") {
                return {
                  _id: itemId,
                  listId,
                  clientId: "client_item_1",
                  isCompleted: false,
                };
              }
              return { householdId, userId };
            },
          }),
        }),
      },
    };

    await expect(
      setItemCompleted(ctx, {
        listId,
        clientId: "client_item_1",
        isCompleted: true,
      }),
    ).resolves.toEqual({ success: true, isCompleted: true });
    expect(patch).toHaveBeenCalledWith(
      itemId,
      expect.objectContaining({ isCompleted: true, completedBy: userId }),
    );
  });

  it("clears an optional estimated price", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const patch = jest.fn(async () => undefined);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async (id: string) =>
          id === itemId
            ? { _id: itemId, listId, estimatedPricePence: 250 }
            : { _id: listId, householdId },
        patch,
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users" ? { _id: userId } : { householdId, userId },
          }),
        }),
      },
    };

    await expect(
      updateItem(ctx, { itemId, estimatedPricePence: null }),
    ).resolves.toEqual({ success: true });
    expect(patch).toHaveBeenCalledWith(
      itemId,
      expect.objectContaining({ estimatedPricePence: undefined }),
    );
  });
});

describe("item attribution", () => {
  it("labels an item from a deleted account as a former household member", async () => {
    const userId = "user_1" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const itemId = "item_1" as Id<"items">;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        get: async (id: string) =>
          id === listId ? { _id: listId, householdId } : null,
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "users" ? { _id: userId } : { householdId, userId },
            collect: async () =>
              table === "items"
                ? [{ _id: itemId, listId, name: "Milk", addedBy: undefined }]
                : [],
          }),
        }),
      },
    };

    await expect(getItems(ctx, { listId })).resolves.toEqual([
      expect.objectContaining({
        _id: itemId,
        addedByUser: { name: "Former household member" },
      }),
    ]);
  });
});
