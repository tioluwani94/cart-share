import type { Id } from "./_generated/dataModel";
import { disableAllDevices, getDueDeliveries } from "./notifications";

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
});
