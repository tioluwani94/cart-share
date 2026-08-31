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

export interface ShopCompletionItemSnapshot {
  itemId?: Id<"items">;
  clientId?: string;
  isCompleted: boolean;
}

interface ShopCompletionArgs {
  householdId: Id<"households">;
  listId: Id<"lists">;
  operationId: string;
  sessionDate: number;
  items: ShopCompletionItemSnapshot[];
}

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
    }
  | {
      id: string;
      scope: OfflineScope;
      queuedAt: number;
      retryCount?: number;
      type: "sessions.complete";
      args: ShopCompletionArgs;
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
    }
  | {
      type: "sessions.complete";
      args: ShopCompletionArgs;
    };

type OperationArgs<TType extends OfflineOperation["type"]> = Extract<
  OfflineOperation,
  { type: TType }
>["args"];

export interface OfflineOperationAdapter {
  addItem(args: OperationArgs<"items.add">): Promise<unknown>;
  setCompleted(args: OperationArgs<"items.setCompleted">): Promise<unknown>;
  updateItem(args: OperationArgs<"items.update">): Promise<unknown>;
  removeItem(args: OperationArgs<"items.remove">): Promise<unknown>;
  decideRestock(args: OperationArgs<"restocks.decide">): Promise<unknown>;
  completeShop(args: OperationArgs<"sessions.complete">): Promise<unknown>;
  recalculateReminders(): Promise<unknown>;
}

export async function executeOfflineOperation(
  operation: OfflineOperation,
  adapter: OfflineOperationAdapter,
): Promise<void> {
  switch (operation.type) {
    case "items.add":
      await adapter.addItem(operation.args);
      return;
    case "items.setCompleted":
      await adapter.setCompleted(operation.args);
      return;
    case "items.update":
      await adapter.updateItem(operation.args);
      return;
    case "items.remove":
      await adapter.removeItem(operation.args);
      return;
    case "restocks.decide":
      await adapter.decideRestock(operation.args);
      await adapter.recalculateReminders();
      return;
    case "sessions.complete":
      await adapter.completeShop(operation.args);
      await adapter.recalculateReminders();
  }
}

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
  inFlightOperationIds: ReadonlySet<string> = new Set(),
): OfflineOperation[] {
  if (operation.type === "items.remove" && operation.args.clientId) {
    const hasInFlightAdd = queue.some(
      (entry) =>
        scopesMatch(entry.scope, operation.scope) &&
        entry.type === "items.add" &&
        entry.args.listId === operation.args.listId &&
        entry.args.clientId === operation.args.clientId &&
        inFlightOperationIds.has(entry.id),
    );
    const hasCancellableAdd = queue.some(
      (entry) =>
        scopesMatch(entry.scope, operation.scope) &&
        entry.type === "items.add" &&
        entry.args.listId === operation.args.listId &&
        entry.args.clientId === operation.args.clientId &&
        !inFlightOperationIds.has(entry.id),
    );

    if (hasCancellableAdd && !hasInFlightAdd) {
      return queue.filter(
        (entry) =>
          !(
            scopesMatch(entry.scope, operation.scope) &&
            entry.type !== "restocks.decide" &&
            entry.type !== "sessions.complete" &&
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
