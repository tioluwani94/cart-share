import type { Id } from "@/convex/_generated/dataModel";
import {
  appendOfflineOperation,
  getOfflineQueueStorageKey,
  getReplayOperations,
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
      remaining: [{ ...first, retryCount: 1 }, second],
    });
  });

  it("keeps an absolute restock decision and stable operation ID in scope", () => {
    const decision = operation(
      {
        type: "restocks.decide",
        args: {
          householdProductId:
            "household_product_1" as Id<"householdProducts">,
          decision: "still_have_some",
          operationId: "restock_operation_1",
        },
      },
      1,
    );

    expect(getReplayOperations([decision], scope)).toEqual([decision]);
    expect(decision.args).toEqual(
      expect.objectContaining({
        decision: "still_have_some",
        operationId: "restock_operation_1",
      }),
    );
  });
});
