import type { Id } from "@/convex/_generated/dataModel";
import {
  appendOfflineOperation,
  executeOfflineOperation,
  getOfflineConflictStorageKey,
  getOfflineQueueStorageKey,
  getReplayOperations,
  OfflineTerminalConflictError,
  removeScopeOperations,
  replayOfflineOperations,
  type OfflineOperation,
  type OfflineScope,
} from "./offlineQueue";

const scope: OfflineScope = {
  clerkUserId: "clerk_user_1",
  householdId: "household_1" as Id<"households">,
};

function operation(
  input: Omit<OfflineOperation, "id" | "scope" | "queuedAt">,
  index: number,
): OfflineOperation {
  return {
    ...input,
    id: `operation_${index}`,
    scope,
    queuedAt: index,
  } as OfflineOperation;
}

describe("offline queue", () => {
  it("replays add, completion, and edit against one stable client item", () => {
    const clientId = "client_item_1";
    let queue: OfflineOperation[] = [];

    queue = appendOfflineOperation(
      queue,
      operation(
        {
          type: "items.add",
          args: {
            listId: "list_1" as Id<"lists">,
            clientId,
            name: "Milk",
          },
        },
        1,
      ),
    );
    queue = appendOfflineOperation(
      queue,
      operation(
        {
          type: "items.setCompleted",
          args: {
            listId: "list_1" as Id<"lists">,
            clientId,
            isCompleted: true,
          },
        },
        2,
      ),
    );
    queue = appendOfflineOperation(
      queue,
      operation(
        {
          type: "items.update",
          args: {
            listId: "list_1" as Id<"lists">,
            clientId,
            notes: "Semi-skimmed",
          },
        },
        3,
      ),
    );

    expect(getReplayOperations(queue, scope)).toEqual(queue);
    expect(
      queue.map((entry) =>
        "clientId" in entry.args ? entry.args.clientId : undefined,
      ),
    ).toEqual([
      clientId,
      clientId,
      clientId,
    ]);
  });

  it("drops an unsynced add and its dependent operations when deleted", () => {
    const clientId = "client_item_2";
    const listId = "list_1" as Id<"lists">;
    let queue: OfflineOperation[] = [];

    queue = appendOfflineOperation(
      queue,
      operation(
        { type: "items.add", args: { listId, clientId, name: "Bread" } },
        1,
      ),
    );
    queue = appendOfflineOperation(
      queue,
      operation(
        {
          type: "items.setCompleted",
          args: { listId, clientId, isCompleted: true },
        },
        2,
      ),
    );
    queue = appendOfflineOperation(
      queue,
      operation(
        { type: "items.remove", args: { listId, clientId } },
        3,
      ),
    );

    expect(queue).toEqual([]);
  });

  it("keeps a delete queued when its matching offline add is already replaying", () => {
    const clientId = "client_item_in_flight";
    const listId = "list_1" as Id<"lists">;
    const add = operation(
      { type: "items.add", args: { listId, clientId, name: "Butter" } },
      1,
    );
    const remove = operation(
      { type: "items.remove", args: { listId, clientId } },
      2,
    );

    const queue = appendOfflineOperation(
      [add],
      remove,
      new Set([add.id]),
    );

    expect(queue).toEqual([add, remove]);
  });

  it("isolates replay by user and household", () => {
    const otherScope: OfflineScope = {
      clerkUserId: "clerk_user_2",
      householdId: "household_2" as Id<"households">,
    };
    const first = operation(
      {
        type: "items.add",
        args: {
          listId: "list_1" as Id<"lists">,
          clientId: "client_item_3",
          name: "Apples",
        },
      },
      1,
    );
    const second: OfflineOperation = {
      id: "operation_2",
      scope: otherScope,
      queuedAt: 2,
      type: "items.add",
      args: {
        listId: "list_2" as Id<"lists">,
        clientId: "client_item_4",
        name: "Pears",
      },
    };
    const queue = [first, second];

    expect(getOfflineQueueStorageKey(scope)).not.toBe(
      getOfflineQueueStorageKey(otherScope),
    );
    expect(getOfflineConflictStorageKey(scope)).not.toBe(
      getOfflineConflictStorageKey(otherScope),
    );
    expect(getReplayOperations(queue, scope)).toEqual([first]);
    expect(removeScopeOperations(queue, scope)).toEqual([second]);
  });

  it("does not let later writes overtake a failed earlier operation", async () => {
    const listId = "list_1" as Id<"lists">;
    const first = operation(
      {
        type: "items.add",
        args: {
          listId,
          clientId: "client_item_5",
          name: "Tea",
        },
      },
      1,
    );
    const second = operation(
      {
        type: "items.setCompleted",
        args: {
          listId,
          clientId: "client_item_5",
          isCompleted: true,
        },
      },
      2,
    );
    const execute = jest.fn(async () => {
      throw new Error("network interrupted");
    });

    const result = await replayOfflineOperations([first, second], execute);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: 0,
      failed: 1,
      conflicts: [],
      remaining: [{ ...first, retryCount: 1 }, second],
    });
  });

  it("keeps a restock Add bound to its intended list", () => {
    const expectedActiveListId = "list_1" as Id<"lists">;
    const decision = operation(
      {
        type: "restocks.decide",
        args: {
          householdProductId:
            "household_product_1" as Id<"householdProducts">,
          decision: "add",
          operationId: "restock_operation_1",
          expectedActiveListId,
        },
      },
      1,
    );

    expect(getReplayOperations([decision], scope)).toEqual([decision]);
    expect(decision.args).toEqual(
      expect.objectContaining({
        decision: "add",
        expectedActiveListId,
        operationId: "restock_operation_1",
      }),
    );
  });

  it("turns a legacy unbound restock Add into a visible conflict", async () => {
    const householdProductId =
      "household_product_legacy" as Id<"householdProducts">;
    const legacyOperation = {
      id: "operation_legacy",
      scope,
      queuedAt: 1,
      type: "restocks.decide",
      args: {
        householdProductId,
        decision: "add",
        operationId: "restock_operation_legacy",
      },
    } as OfflineOperation;
    const adapter = {
      addItem: jest.fn(),
      setCompleted: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      decideRestock: jest.fn(),
      completeShop: jest.fn(),
      recalculateReminders: jest.fn(),
    };

    const result = await replayOfflineOperations(
      [legacyOperation],
      (entry) => executeOfflineOperation(entry, adapter),
    );

    expect(adapter.decideRestock).not.toHaveBeenCalled();
    expect(result.remaining).toEqual([]);
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        householdProductId,
        type: "restocks.active_list_changed",
      }),
    ]);
  });

  it("records an intended-list conflict and continues unrelated FIFO work", async () => {
    const listId = "list_1" as Id<"lists">;
    const householdProductId =
      "household_product_1" as Id<"householdProducts">;
    const conflictedAdd = operation(
      {
        type: "restocks.decide",
        args: {
          householdProductId,
          decision: "add",
          operationId: "restock_operation_1",
          expectedActiveListId: listId,
        },
      },
      1,
    );
    const laterItem = operation(
      {
        type: "items.add",
        args: {
          listId: "list_2" as Id<"lists">,
          clientId: "client_item_1",
          name: "Tea",
        },
      },
      2,
    );
    const execute = jest.fn(async (entry: OfflineOperation) => {
      if (entry.id === conflictedAdd.id) {
        throw new OfflineTerminalConflictError("restocks.active_list_changed");
      }
    });

    const result = await replayOfflineOperations(
      [conflictedAdd, laterItem],
      execute,
    );

    expect(execute).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: 1,
      failed: 0,
      remaining: [],
      conflicts: [
        expect.objectContaining({
          id: conflictedAdd.id,
          householdProductId,
          intendedListId: listId,
          type: "restocks.active_list_changed",
        }),
      ],
    });
  });

  it("keeps an offline shop completion snapshot and stable operation ID in scope", () => {
    const completion = operation(
      {
        type: "sessions.complete",
        args: {
          householdId: scope.householdId,
          listId: "list_1" as Id<"lists">,
          operationId: "shop_completion_1",
          sessionDate: Date.UTC(2026, 7, 31, 12),
          items: [
            {
              clientId: "client_item_1",
              isCompleted: true,
            },
          ],
        },
      },
      1,
    );

    expect(getReplayOperations([completion], scope)).toEqual([completion]);
    expect(completion.args).toEqual(
      expect.objectContaining({
        operationId: "shop_completion_1",
        items: [{ clientId: "client_item_1", isCompleted: true }],
      }),
    );
  });

  it("replays shop completion after earlier item writes and never across scopes", async () => {
    const listId = "list_1" as Id<"lists">;
    const otherScope: OfflineScope = {
      clerkUserId: "clerk_user_2",
      householdId: "household_2" as Id<"households">,
    };
    const add = operation(
      {
        type: "items.add",
        args: {
          listId,
          clientId: "client_item_1",
          name: "Milk",
        },
      },
      1,
    );
    const completion = operation(
      {
        type: "sessions.complete",
        args: {
          householdId: scope.householdId,
          listId,
          operationId: "shop_completion_1",
          sessionDate: Date.UTC(2026, 7, 31, 12),
          items: [{ clientId: "client_item_1", isCompleted: true }],
        },
      },
      2,
    );
    const otherCompletion: OfflineOperation = {
      id: "operation_3",
      scope: otherScope,
      queuedAt: 3,
      type: "sessions.complete",
      args: {
        householdId: otherScope.householdId,
        listId,
        operationId: "shop_completion_2",
        sessionDate: Date.UTC(2026, 7, 31, 12),
        items: [{ clientId: "client_item_2", isCompleted: true }],
      },
    };
    const executed: string[] = [];

    const replay = getReplayOperations(
      [otherCompletion, completion, add],
      scope,
    );
    const result = await replayOfflineOperations(replay, async (entry) => {
      executed.push(entry.type);
    });

    expect(executed).toEqual(["items.add", "sessions.complete"]);
    expect(result).toEqual({
      success: 2,
      failed: 0,
      conflicts: [],
      remaining: [],
    });
  });

  it("dispatches item writes before completion through the production executor", async () => {
    const listId = "list_1" as Id<"lists">;
    const add = operation(
      {
        type: "items.add",
        args: {
          listId,
          clientId: "client_item_1",
          name: "Milk",
        },
      },
      1,
    );
    const completion = operation(
      {
        type: "sessions.complete",
        args: {
          householdId: scope.householdId,
          listId,
          operationId: "shop_completion_1",
          sessionDate: Date.UTC(2026, 7, 31, 12),
          items: [{ clientId: "client_item_1", isCompleted: true }],
        },
      },
      2,
    );
    const calls: string[] = [];
    const adapter = {
      addItem: jest.fn(async () => {
        calls.push("items.add");
      }),
      setCompleted: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      decideRestock: jest.fn(),
      completeShop: jest.fn(async () => {
        calls.push("sessions.complete");
      }),
      recalculateReminders: jest.fn(),
    };

    await replayOfflineOperations([add, completion], (entry) =>
      executeOfflineOperation(entry, adapter),
    );

    expect(calls).toEqual(["items.add", "sessions.complete"]);
    expect(adapter.completeShop).toHaveBeenCalledWith(completion.args);
  });
});
