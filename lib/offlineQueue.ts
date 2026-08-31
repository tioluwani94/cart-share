import type { Id } from "@/convex/_generated/dataModel";

export interface OfflineScope {
  clerkUserId: string;
  householdId: Id<"households">;
}

interface ItemReference {
  listId: Id<"lists">;
  itemId?: Id<"items">;
  clientId?: string;
}

interface ItemDetails {
  name?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  estimatedPricePence?: number;
}

type ItemUpdates = Omit<ItemDetails, "estimatedPricePence"> & {
  estimatedPricePence?: number | null;
};

type RestockDecision =
  | "add"
  | "still_have_some"
  | "not_this_time"
  | "stop_tracking";

export type OfflineOperation =
  | {
      id: string;
      scope: OfflineScope;
      queuedAt: number;
      retryCount?: number;
      type: "items.add";
      args: ItemDetails & {
        listId: Id<"lists">;
        clientId: string;
        name: string;
      };
    }
  | {
      id: string;
      scope: OfflineScope;
      queuedAt: number;
      retryCount?: number;
      type: "items.setCompleted";
      args: ItemReference & { isCompleted: boolean };
    }
  | {
      id: string;
      scope: OfflineScope;
      queuedAt: number;
      retryCount?: number;
      type: "items.update";
      args: ItemReference & ItemUpdates;
    }
  | {
      id: string;
      scope: OfflineScope;
      queuedAt: number;
      retryCount?: number;
      type: "items.remove";
      args: ItemReference;
    }
  | {
      id: string;
      scope: OfflineScope;
      queuedAt: number;
      retryCount?: number;
      type: "restocks.decide";
      args: {
        householdProductId: Id<"householdProducts">;
        decision: RestockDecision;
        operationId: string;
      };
    };

export type NewOfflineOperation =
  | {
      type: "items.add";
      args: ItemDetails & {
        listId: Id<"lists">;
        clientId: string;
        name: string;
      };
    }
  | {
      type: "items.setCompleted";
      args: ItemReference & { isCompleted: boolean };
    }
  | { type: "items.update"; args: ItemReference & ItemUpdates }
  | { type: "items.remove"; args: ItemReference }
  | {
      type: "restocks.decide";
      args: {
        householdProductId: Id<"householdProducts">;
        decision: RestockDecision;
        operationId: string;
      };
    };

export function scopesMatch(a: OfflineScope, b: OfflineScope): boolean {
  return (
    a.clerkUserId === b.clerkUserId && a.householdId === b.householdId
  );
}

export function getOfflineQueueStorageKey(scope: OfflineScope): string {
  return `offline:queue:${encodeURIComponent(scope.clerkUserId)}:${scope.householdId}`;
}

export function appendOfflineOperation(
  queue: OfflineOperation[],
  operation: OfflineOperation,
): OfflineOperation[] {
  if (operation.type === "items.remove" && operation.args.clientId) {
    const hasUnsyncedAdd = queue.some(
      (entry) =>
        scopesMatch(entry.scope, operation.scope) &&
        entry.type === "items.add" &&
        entry.args.listId === operation.args.listId &&
        entry.args.clientId === operation.args.clientId,
    );

    if (hasUnsyncedAdd) {
      return queue.filter(
        (entry) =>
          !(
            scopesMatch(entry.scope, operation.scope) &&
            entry.type !== "restocks.decide" &&
            entry.args.listId === operation.args.listId &&
            entry.args.clientId === operation.args.clientId
          ),
      );
    }
  }

  return [...queue, operation].sort((a, b) => a.queuedAt - b.queuedAt);
}

export function getReplayOperations(
  queue: OfflineOperation[],
  scope: OfflineScope,
): OfflineOperation[] {
  return queue
    .filter((operation) => scopesMatch(operation.scope, scope))
    .sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function replayOfflineOperations(
  operations: OfflineOperation[],
  execute: (operation: OfflineOperation) => Promise<void>,
  shouldContinue: () => boolean = () => true,
): Promise<{
  success: number;
  failed: number;
  remaining: OfflineOperation[];
}> {
  let success = 0;

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    if (!shouldContinue()) {
      return {
        success,
        failed: 0,
        remaining: operations.slice(index),
      };
    }

    try {
      await execute(operation);
      success += 1;
    } catch {
      return {
        success,
        failed: 1,
        remaining: [
          {
            ...operation,
            retryCount: (operation.retryCount ?? 0) + 1,
          },
          ...operations.slice(index + 1),
        ],
      };
    }
  }

  return { success, failed: 0, remaining: [] };
}

export function removeScopeOperations(
  queue: OfflineOperation[],
  scope: OfflineScope,
): OfflineOperation[] {
  return queue.filter((operation) => !scopesMatch(operation.scope, scope));
}

export function createOfflineId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createOfflineOperation(
  scope: OfflineScope,
  operation: NewOfflineOperation,
): OfflineOperation {
  return {
    ...operation,
    id: createOfflineId("operation"),
    scope,
    queuedAt: Date.now(),
    retryCount: 0,
  } as OfflineOperation;
}
