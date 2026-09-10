import type { ItemWithUser } from "./useCachedQuery";
import type { OfflineOperation } from "./offlineQueue";
import type { Id } from "@/convex/_generated/dataModel";

/** Overlay pending absolute operations so reconnecting queries cannot erase local intent. */
export function applyPendingItemOperations(
  source: ItemWithUser[],
  listId: Id<"lists">,
  operations: readonly OfflineOperation[],
): ItemWithUser[] {
  let items = source.map((item) => ({
    ...item,
    isPendingSync: false,
    pendingMutationId: undefined as string | undefined,
  }));
  for (const operation of operations) {
    if (!("listId" in operation.args) || operation.args.listId !== listId)
      continue;
    if (operation.type === "items.add") {
      if (!items.some((item) => item.clientId === operation.args.clientId)) {
        items.push({
          ...operation.args,
          _id: `temp_${operation.args.clientId}` as Id<"items">,
          _creationTime: operation.queuedAt,
          createdAt: operation.queuedAt,
          updatedAt: operation.queuedAt,
          isCompleted: false,
          isPendingSync: true,
          pendingMutationId: operation.id,
        });
      }
    }
    if (!operation.type.startsWith("items.")) continue;
    const args = operation.args;
    const matches = (item: ItemWithUser) =>
      ("itemId" in args && args.itemId === item._id) ||
      ("clientId" in args &&
        Boolean(args.clientId) &&
        args.clientId === item.clientId);
    if (operation.type === "items.remove") {
      items = items.filter((item) => !matches(item));
    } else {
      items = items.map((item) => {
        if (!matches(item)) return item;
        let updates: Partial<ItemWithUser> = {};
        if (operation.type === "items.setCompleted") {
          updates = { isCompleted: operation.args.isCompleted };
        } else if (operation.type === "items.update") {
          const fields = { ...operation.args } as Partial<
            typeof operation.args
          >;
          delete fields.listId;
          delete fields.itemId;
          delete fields.clientId;
          for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
            if (fields[key] === undefined) delete fields[key];
          }
          updates = {
            ...fields,
            estimatedPricePence:
              fields.estimatedPricePence === null
                ? undefined
                : fields.estimatedPricePence,
          };
          if (!("estimatedPricePence" in fields))
            delete updates.estimatedPricePence;
        }
        return {
          ...item,
          ...updates,
          isPendingSync: true,
          pendingMutationId: operation.id,
        };
      });
    }
  }
  return items;
}
