import type { Id } from "./_generated/dataModel";
import {
  disableAllDevices,
  excludeProductsAlreadyPlanned,
  getDueDeliveries,
} from "./notifications";

type DisableDevicesHandler = (
  ctx: unknown,
  args: Record<string, never>,
) => Promise<{ disabled: number }>;

const disableSignedInUsersDevices = (
  disableAllDevices as unknown as { _handler: DisableDevicesHandler }
)._handler;

type DueDeliveriesHandler = (
  ctx: unknown,
  args: { now: number },
) => Promise<unknown>;

const readDueDeliveries = (
  getDueDeliveries as unknown as { _handler: DueDeliveriesHandler }
)._handler;

describe("notifications.disableAllDevices", () => {
  it("disables only tokens scoped to the signed-in user", async () => {
    const userId = "user_1" as Id<"users">;
    const tokenIds = [
      "token_1" as Id<"pushTokens">,
      "token_2" as Id<"pushTokens">,
    ];
    const patch = jest.fn(async (_id: string, _changes: object) => undefined);
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "users" ? { _id: userId } : null),
            collect: async () =>
              table === "pushTokens"
                ? tokenIds.map((_id) => ({ _id, userId }))
                : [],
          }),
        }),
        patch,
      },
    };

    await expect(disableSignedInUsersDevices(ctx, {})).resolves.toEqual({
      disabled: 2,
    });
    expect(patch.mock.calls.map(([id]) => id)).toEqual(tokenIds);
    expect(patch).toHaveBeenCalledWith(
      tokenIds[0],
      expect.objectContaining({ disabledAt: expect.any(Number) }),
    );
  });
});

describe("notifications.getDueDeliveries", () => {
  it("cancels a reminder when the recipient no longer belongs to the household", async () => {
    const reminderId = "reminder_1" as Id<"notificationReminders">;
    const householdId = "household_1" as Id<"households">;
    const userId = "user_1" as Id<"users">;
    const ctx = {
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            take: async () =>
              table === "notificationReminders"
                ? [
                    {
                      _id: reminderId,
                      userId,
                      householdId,
                      kind: "restock_review" as const,
                      status: "pending" as const,
                      scheduledFor: 1,
                    },
                  ]
                : [],
            unique: async () => null,
            collect: async () => [],
          }),
        }),
      },
    };

    await expect(readDueDeliveries(ctx, { now: 2 })).resolves.toEqual([
      { reminderId, action: "cancel" },
    ]);
  });

  it("cancels a stale reminder when every due product is already planned", async () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.UTC(2026, 8, 1, 12);
    const reminderId = "reminder_1" as Id<"notificationReminders">;
    const householdId = "household_1" as Id<"households">;
    const userId = "user_1" as Id<"users">;
    const listId = "list_1" as Id<"lists">;
    const productId = "product_1" as Id<"householdProducts">;
    const ctx = {
      db: {
        get: async (id: string) => {
          if (id === householdId) {
            return { _id: householdId, activeListId: listId };
          }
          if (id === listId) {
            return {
              _id: listId,
              isArchived: false,
              plannedFor: now + DAY_MS,
            };
          }
          return null;
        },
        query: (table: string) => ({
          withIndex: () => ({
            take: async () =>
              table === "notificationReminders"
                ? [
                    {
                      _id: reminderId,
                      userId,
                      householdId,
                      kind: "restock_review" as const,
                      status: "pending" as const,
                      scheduledFor: now,
                    },
                  ]
                : [],
            unique: async () => {
              if (table === "householdMembers") return { userId, householdId };
              if (table === "userPreferences") {
                return {
                  restockNotificationsEnabled: true,
                  notificationTimeZone: "Europe/London",
                };
              }
              return null;
            },
            collect: async () => {
              if (table === "householdProducts") {
                return [
                  {
                    _id: productId,
                    displayName: "Milk",
                    status: "active" as const,
                    cadenceDays: 1,
                    lastPurchasedAt: now - 2 * DAY_MS,
                    createdAt: now - 30 * DAY_MS,
                    purchaseObservationCount: 2,
                  },
                ];
              }
              if (table === "items") {
                return [{ householdProductId: productId, isCompleted: false }];
              }
              if (table === "pushTokens") {
                return [{ token: "ExponentPushToken[test]" }];
              }
              return [];
            },
          }),
        }),
      },
    };

    await expect(readDueDeliveries(ctx, { now })).resolves.toEqual([
      { reminderId, action: "cancel" },
    ]);
  });
});

describe("excludeProductsAlreadyPlanned", () => {
  it("removes products linked to items on the active list", () => {
    const milk = { _id: "product_1" };
    const bread = { _id: "product_2" };

    expect(
      excludeProductsAlreadyPlanned([milk, bread], [
        { householdProductId: "product_1", isCompleted: false },
        { householdProductId: "product_2", isCompleted: true },
      ]),
    ).toEqual([]);
  });
});
