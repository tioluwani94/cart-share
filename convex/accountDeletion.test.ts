import type { Id } from "./_generated/dataModel";
import { continueDeletion, deleteByClerkId } from "./users";

type TableName =
  | "users"
  | "accountDeletionTombstones"
  | "households"
  | "householdMembers"
  | "lists"
  | "items"
  | "receiptUploads"
  | "householdProducts"
  | "productPurchaseObservations"
  | "restockUndoRecords"
  | "userPreferences"
  | "pushTokens"
  | "notificationReminders"
  | "shoppingSessions";

type Row = { _id: string; [key: string]: unknown };
type Tables = Record<TableName, Row[]>;

const indexFields: Record<string, string[]> = {
  "restockUndoRecords.by_user": ["userId"],
  "restockUndoRecords.by_household": ["householdId"],
  "users.by_clerk_id": ["clerkId"],
  "accountDeletionTombstones.by_clerk_id_digest": ["clerkIdDigest"],
  "householdMembers.by_user": ["userId"],
  "householdMembers.by_household": ["householdId"],
  "lists.by_household": ["householdId"],
  "lists.by_created_by": ["createdBy"],
  "items.by_list": ["listId"],
  "items.by_added_by": ["addedBy"],
  "items.by_completed_by": ["completedBy"],
  "receiptUploads.by_uploaded_by": ["uploadedBy"],
  "receiptUploads.by_household": ["householdId"],
  "householdProducts.by_created_by": ["createdBy"],
  "householdProducts.by_household_and_status": ["householdId", "status"],
  "productPurchaseObservations.by_household_and_date": ["householdId"],
  "userPreferences.by_user": ["userId"],
  "pushTokens.by_user": ["userId"],
  "notificationReminders.by_user": ["userId"],
  "shoppingSessions.by_household": ["householdId"],
  "shoppingSessions.by_shopper": ["shopperId"],
  "shoppingSessions.by_paid_by": ["paidBy"],
};

function createContext(seed: Partial<Tables>) {
  const tables = {
    users: [],
    accountDeletionTombstones: [],
    households: [],
    householdMembers: [],
    lists: [],
    items: [],
    receiptUploads: [],
    householdProducts: [],
    productPurchaseObservations: [],
    restockUndoRecords: [],
    userPreferences: [],
    pushTokens: [],
    notificationReminders: [],
    shoppingSessions: [],
    ...seed,
  } satisfies Tables;
  const storedFiles = new Set(
    [
      ...tables.receiptUploads.map((row) => row.storageId),
      ...tables.shoppingSessions.map((row) => row.receiptImageId),
    ].filter((value): value is string => typeof value === "string"),
  );
  const storageDelete = jest.fn(async (storageId: string) => {
    storedFiles.delete(storageId);
  });
  const scheduleRunAfter = jest.fn(async () => undefined);

  const ctx = {
    db: {
      get: async (id: string) =>
        Object.values(tables)
          .flat()
          .find((row) => row._id === id) ?? null,
      query: (table: TableName) => ({
        withIndex: (index: string, build: (query: unknown) => unknown) => {
          const values: unknown[] = [];
          const query = {
            eq: (_field: string, value: unknown) => {
              values.push(value);
              return query;
            },
          };
          build(query);
          const fields = indexFields[`${table}.${index}`];
          if (!fields) throw new Error(`Unknown test index ${table}.${index}`);
          const matches = () =>
            tables[table].filter((row) =>
              fields.every((field, indexPosition) =>
                Object.is(row[field], values[indexPosition]),
              ),
            );
          return {
            collect: async () => matches(),
            take: async (count: number) => matches().slice(0, count),
            unique: async () => {
              const rows = matches();
              if (rows.length > 1) throw new Error("Expected unique row");
              return rows[0] ?? null;
            },
            first: async () => matches()[0] ?? null,
          };
        },
      }),
      patch: async (id: string, value: Record<string, unknown>) => {
        const row = Object.values(tables)
          .flat()
          .find((candidate) => candidate._id === id);
        if (!row) throw new Error(`Missing row ${id}`);
        Object.assign(row, value);
      },
      insert: async (table: TableName, value: Record<string, unknown>) => {
        const id = `${table}_${tables[table].length + 1}`;
        tables[table].push({ _id: id, ...value });
        return id;
      },
      delete: async (id: string) => {
        for (const rows of Object.values(tables)) {
          const index = rows.findIndex((row) => row._id === id);
          if (index >= 0) {
            rows.splice(index, 1);
            return;
          }
        }
      },
    },
    scheduler: { runAfter: scheduleRunAfter },
    storage: {
      delete: storageDelete,
      getMetadata: async (storageId: string) =>
        storedFiles.has(storageId) ? { storageId } : null,
    },
  };

  return { ctx, tables, storageDelete, scheduleRunAfter };
}

type DeleteByClerkIdHandler = (
  ctx: unknown,
  args: { clerkId: string },
) => Promise<unknown>;

const deleteAccount = (
  deleteByClerkId as unknown as { _handler: DeleteByClerkIdHandler }
)._handler;

type ContinueDeletionHandler = (
  ctx: unknown,
  args: { deletingClerkId: string },
) => Promise<unknown>;

const continueAccountDeletion = (
  continueDeletion as unknown as { _handler: ContinueDeletionHandler }
)._handler;

function getLastScheduledDeletionArgs(scheduleRunAfter: {
  mock: { calls: unknown };
}): { deletingClerkId: string } {
  const calls = scheduleRunAfter.mock.calls as [
    number,
    unknown,
    { deletingClerkId: string },
  ][];
  const args = calls.at(-1)?.[2];
  if (!args) throw new Error("Expected a scheduled deletion continuation");
  return args;
}

describe("account deletion", () => {
  it("removes a member while preserving shared household data", async () => {
    const ownerId = "user_owner" as Id<"users">;
    const userId = "user_member" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const { ctx, tables, storageDelete } = createContext({
      users: [
        { _id: ownerId, clerkId: "clerk_owner" },
        {
          _id: userId,
          clerkId: "clerk_member",
          email: "former@example.com",
          name: "Former member",
          imageUrl: "https://example.com/former.png",
        },
      ],
      households: [{ _id: householdId, ownerId }],
      householdMembers: [
        {
          _id: "membership_owner",
          householdId,
          userId: ownerId,
          role: "owner",
          joinedAt: 1,
        },
        {
          _id: "membership_member",
          householdId,
          userId,
          role: "member",
          joinedAt: 2,
        },
      ],
      lists: [
        { _id: listId, householdId, createdBy: userId, name: "Next shop" },
      ],
      items: [
        {
          _id: "item_added",
          listId,
          addedBy: userId,
          completedBy: ownerId,
        },
        {
          _id: "item_completed",
          listId,
          addedBy: ownerId,
          completedBy: userId,
        },
      ],
      receiptUploads: [
        {
          _id: "receipt_1",
          householdId,
          uploadedBy: userId,
          storageId: "storage_1",
        },
      ],
      householdProducts: [
        { _id: "product_1", householdId, createdBy: userId, status: "active" },
      ],
      userPreferences: [{ _id: "preference_1", userId }],
      restockUndoRecords: [{ _id: "undo_1", userId, householdId }],
      pushTokens: [{ _id: "push_1", userId }],
      notificationReminders: [{ _id: "reminder_1", userId, householdId }],
      shoppingSessions: [
        {
          _id: "session_1",
          householdId,
          shopperId: userId,
          paidBy: userId,
        },
      ],
    });

    await deleteAccount(ctx, { clerkId: "clerk_member" });

    expect(tables.users.map((row) => row._id)).toEqual([ownerId]);
    expect(tables.householdMembers.map((row) => row._id)).toEqual([
      "membership_owner",
    ]);
    expect(tables.households).toHaveLength(1);
    expect(tables.lists[0].createdBy).toBeUndefined();
    expect(tables.items[0].addedBy).toBeUndefined();
    expect(tables.items[1].completedBy).toBeUndefined();
    expect(tables.receiptUploads[0].uploadedBy).toBeUndefined();
    expect(tables.householdProducts[0].createdBy).toBeUndefined();
    expect(tables.shoppingSessions[0].shopperId).toBeUndefined();
    expect(tables.shoppingSessions[0].paidBy).toBeUndefined();
    expect(tables.shoppingSessions[0].paidByFormerMember).toBe(true);
    expect(tables.userPreferences).toHaveLength(0);
    expect(tables.restockUndoRecords).toHaveLength(0);
    expect(tables.pushTokens).toHaveLength(0);
    expect(tables.notificationReminders).toHaveLength(0);
    expect(storageDelete).not.toHaveBeenCalled();
  });

  it("transfers ownership to the earliest remaining household member", async () => {
    const ownerId = "user_owner" as Id<"users">;
    const nextOwnerId = "user_next" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const { ctx, tables } = createContext({
      users: [
        { _id: ownerId, clerkId: "clerk_owner" },
        { _id: nextOwnerId, clerkId: "clerk_next" },
      ],
      households: [{ _id: householdId, ownerId, updatedAt: 1 }],
      householdMembers: [
        {
          _id: "membership_owner",
          householdId,
          userId: ownerId,
          role: "owner",
          joinedAt: 1,
        },
        {
          _id: "membership_next",
          householdId,
          userId: nextOwnerId,
          role: "member",
          joinedAt: 2,
        },
      ],
    });

    await deleteAccount(ctx, { clerkId: "clerk_owner" });

    expect(tables.households[0].ownerId).toBe(nextOwnerId);
    expect(tables.householdMembers).toEqual([
      expect.objectContaining({
        _id: "membership_next",
        userId: nextOwnerId,
        role: "owner",
      }),
    ]);
    expect(tables.users.map((row) => row._id)).toEqual([nextOwnerId]);
  });

  it("deletes the final member's household data and private receipt files", async () => {
    const userId = "user_final" as Id<"users">;
    const householdId = "household_final" as Id<"households">;
    const listId = "list_final" as Id<"lists">;
    const { ctx, tables, storageDelete } = createContext({
      users: [{ _id: userId, clerkId: "clerk_final" }],
      households: [{ _id: householdId, ownerId: userId }],
      householdMembers: [
        {
          _id: "membership_final",
          householdId,
          userId,
          role: "owner",
          joinedAt: 1,
        },
      ],
      lists: [{ _id: listId, householdId, createdBy: userId }],
      items: [{ _id: "item_final", listId, addedBy: userId }],
      receiptUploads: [
        {
          _id: "receipt_current",
          householdId,
          uploadedBy: userId,
          storageId: "storage_shared",
        },
        {
          _id: "receipt_former_member",
          householdId,
          uploadedBy: undefined,
          storageId: "storage_former",
        },
      ],
      householdProducts: [
        {
          _id: "product_active",
          householdId,
          createdBy: userId,
          status: "active",
        },
        {
          _id: "product_paused",
          householdId,
          createdBy: undefined,
          status: "paused",
        },
        {
          _id: "product_learning",
          householdId,
          createdBy: userId,
          status: "learning",
        },
      ],
      productPurchaseObservations: [
        {
          _id: "observation_final",
          householdId,
          householdProductId: "product_learning",
          shoppingSessionId: "session_final",
        },
      ],
      userPreferences: [{ _id: "preference_final", userId }],
      pushTokens: [{ _id: "push_final", userId }],
      notificationReminders: [{ _id: "reminder_final", userId, householdId }],
      shoppingSessions: [
        {
          _id: "session_final",
          householdId,
          shopperId: userId,
          receiptImageId: "storage_shared",
        },
      ],
    });

    await deleteAccount(ctx, { clerkId: "clerk_final" });

    for (const [table, rows] of Object.entries(tables)) {
      if (table === "accountDeletionTombstones") continue;
      expect(rows).toHaveLength(0);
    }
    expect(tables.accountDeletionTombstones).toHaveLength(1);
    expect(storageDelete).toHaveBeenCalledTimes(2);
    expect(storageDelete).toHaveBeenCalledWith("storage_shared");
    expect(storageDelete).toHaveBeenCalledWith("storage_former");
  });

  it("treats a retried Clerk deletion webhook as a successful no-op", async () => {
    const userId = "user_final" as Id<"users">;
    const householdId = "household_final" as Id<"households">;
    const { ctx, tables } = createContext({
      users: [{ _id: userId, clerkId: "clerk_final" }],
      households: [{ _id: householdId, ownerId: userId }],
      householdMembers: [
        {
          _id: "membership_final",
          householdId,
          userId,
          role: "owner",
          joinedAt: 1,
        },
      ],
    });

    await expect(
      deleteAccount(ctx, { clerkId: "clerk_final" }),
    ).resolves.toEqual({ status: "deleted_household" });
    await expect(
      deleteAccount(ctx, { clerkId: "clerk_final" }),
    ).resolves.toEqual({ status: "already_deleted" });
    expect(tables.users).toHaveLength(0);
    expect(tables.accountDeletionTombstones).toHaveLength(1);
  });

  it("records a tombstone when Clerk deletes an already-missing Convex user", async () => {
    const { ctx, tables } = createContext({});

    await expect(
      deleteAccount(ctx, { clerkId: "clerk_missing" }),
    ).resolves.toEqual({ status: "already_deleted" });
    await expect(
      deleteAccount(ctx, { clerkId: "clerk_missing" }),
    ).resolves.toEqual({ status: "already_deleted" });

    expect(tables.accountDeletionTombstones).toHaveLength(1);
    expect(tables.accountDeletionTombstones[0]).not.toHaveProperty("clerkId");
  });

  it("leaves an opaque stale-session tombstone after terminal deletion", async () => {
    const userId = "user_final" as Id<"users">;
    const householdId = "household_final" as Id<"households">;
    const { ctx, tables } = createContext({
      users: [{ _id: userId, clerkId: "clerk_final" }],
      households: [{ _id: householdId, ownerId: userId }],
      householdMembers: [
        {
          _id: "membership_final",
          householdId,
          userId,
          role: "owner",
          joinedAt: 1,
        },
      ],
    });

    await deleteAccount(ctx, { clerkId: "clerk_final" });

    expect(tables.users).toHaveLength(0);
    expect(tables.accountDeletionTombstones).toEqual([
      expect.objectContaining({
        clerkIdDigest: expect.not.stringContaining("clerk_final"),
        deletedAt: expect.any(Number),
      }),
    ]);
    expect(tables.accountDeletionTombstones[0]).not.toHaveProperty("clerkId");
  });

  it("finishes a large shared-household deletion across bounded retries", async () => {
    const ownerId = "user_owner" as Id<"users">;
    const userId = "user_member" as Id<"users">;
    const householdId = "household_1" as Id<"households">;
    const listId = "list_1" as Id<"lists">;
    const items = Array.from({ length: 40 }, (_, index) => ({
      _id: `item_${index}`,
      listId,
      addedBy: userId,
      completedBy: userId,
    }));
    const { ctx, tables, scheduleRunAfter } = createContext({
      users: [
        { _id: ownerId, clerkId: "clerk_owner" },
        {
          _id: userId,
          clerkId: "clerk_member",
          email: "former@example.com",
          name: "Former member",
          imageUrl: "https://example.com/former.png",
        },
      ],
      households: [{ _id: householdId, ownerId }],
      householdMembers: [
        {
          _id: "membership_owner",
          householdId,
          userId: ownerId,
          role: "owner",
          joinedAt: 1,
        },
        {
          _id: "membership_member",
          householdId,
          userId,
          role: "member",
          joinedAt: 2,
        },
      ],
      lists: [{ _id: listId, householdId, createdBy: ownerId }],
      items,
    });

    await expect(
      deleteAccount(ctx, { clerkId: "clerk_member" }),
    ).resolves.toEqual({ status: "scheduled" });
    const deletingUser = tables.users.find((row) => row._id === userId);
    expect(deletingUser).toEqual(
      expect.objectContaining({
        clerkId: expect.not.stringContaining("clerk_member"),
        email: "",
        name: undefined,
        imageUrl: undefined,
      }),
    );
    expect(scheduleRunAfter).toHaveBeenCalled();
    expect(JSON.stringify(scheduleRunAfter.mock.calls)).not.toContain(
      "clerk_member",
    );
    expect(scheduleRunAfter).toHaveBeenLastCalledWith(
      0,
      expect.anything(),
      expect.objectContaining({
        deletingClerkId: expect.stringMatching(/^deleting:[0-9a-f]{64}$/),
      }),
    );

    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (!tables.users.some((row) => row._id === userId)) break;
      const continuationArgs = getLastScheduledDeletionArgs(scheduleRunAfter);
      await continueAccountDeletion(ctx, continuationArgs);
    }

    expect(tables.users.some((row) => row._id === userId)).toBe(false);
    expect(tables.items).toHaveLength(40);
    expect(tables.items.every((row) => row.addedBy === undefined)).toBe(true);
    expect(tables.items.every((row) => row.completedBy === undefined)).toBe(
      true,
    );
  });

  it("finishes a large final-household deletion across bounded retries", async () => {
    const userId = "user_final" as Id<"users">;
    const householdId = "household_final" as Id<"households">;
    const listId = "list_final" as Id<"lists">;
    const { ctx, tables, scheduleRunAfter } = createContext({
      users: [{ _id: userId, clerkId: "clerk_final" }],
      households: [{ _id: householdId, ownerId: userId }],
      householdMembers: [
        {
          _id: "membership_final",
          householdId,
          userId,
          role: "owner",
          joinedAt: 1,
        },
      ],
      lists: [{ _id: listId, householdId, createdBy: userId }],
      items: Array.from({ length: 40 }, (_, index) => ({
        _id: `item_${index}`,
        listId,
        addedBy: userId,
      })),
    });

    await expect(
      deleteAccount(ctx, { clerkId: "clerk_final" }),
    ).resolves.toEqual({ status: "scheduled" });
    expect(tables.households).toHaveLength(1);
    expect(scheduleRunAfter).toHaveBeenCalled();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (tables.users.length === 0) break;
      const continuationArgs = getLastScheduledDeletionArgs(scheduleRunAfter);
      await continueAccountDeletion(ctx, continuationArgs);
    }

    for (const [table, rows] of Object.entries(tables)) {
      if (table === "accountDeletionTombstones") continue;
      expect(rows).toHaveLength(0);
    }
    expect(tables.accountDeletionTombstones).toHaveLength(1);
  });
});
