/* eslint-disable @typescript-eslint/no-explicit-any */
import { claim, queueListActivity, send } from "./collaborationNotifications";
import {
  recalculateHouseholdReminders,
  getDueDeliveries,
  authorizeDeliveryRetry,
  sendDueReminders,
  registerDevice,
  updatePreferences,
} from "./notifications";
import { add, setCompleted, update, remove } from "./items";
import { completeOffline } from "./sessions";
import { setNextShop } from "./restocks";

const handler = (fn: unknown): ((ctx: any, args: any) => Promise<any>) =>
  (fn as any)._handler;
const NOW = Date.UTC(2026, 8, 20, 12);

function fixture() {
  const tables: Record<string, any[]> = {
    users: [
      { _id: "u1", clerkId: "c1" },
      { _id: "u2", clerkId: "c2" },
    ],
    households: [{ _id: "h1", activeListId: "l1" }],
    householdMembers: [
      { _id: "m1", userId: "u1", householdId: "h1" },
      { _id: "m2", userId: "u2", householdId: "h1" },
    ],
    lists: [{ _id: "l1", householdId: "h1", isArchived: false }],
    userPreferences: [
      {
        _id: "p1",
        userId: "u1",
        restockNotificationsEnabled: true,
        householdActivityEnabled: true,
        notificationTimeZone: "Europe/London",
        notificationTimeMinutesLocal: 1080,
      },
      {
        _id: "p2",
        userId: "u2",
        restockNotificationsEnabled: true,
        householdActivityEnabled: true,
        notificationTimeZone: "Europe/London",
        notificationTimeMinutesLocal: 1080,
      },
    ],
    pushTokens: [
      { _id: "t1", userId: "u2", token: "ExpoPushToken[test]", deviceId: "d1" },
    ],
    items: [],
    notificationReminders: [],
    shoppingSessions: [],
    householdProducts: [],
  };
  let sequence = 0;
  const db = {
    get: jest.fn(
      async (id: string) =>
        Object.values(tables)
          .flat()
          .find((row) => row._id === id) ?? null,
    ),
    insert: jest.fn(async (table: string, row: any) => {
      const _id = `new_${++sequence}`;
      (tables[table] ??= []).push({ ...row, _id });
      return _id;
    }),
    patch: jest.fn(async (id: string, patch: any) => {
      const row = await db.get(id);
      if (!row) throw new Error("Missing row");
      Object.assign(row, patch);
    }),
    delete: jest.fn(async (id: string) => {
      for (const table of Object.keys(tables))
        tables[table] = tables[table].filter((row) => row._id !== id);
    }),
    query: (table: string) => {
      const predicates: ((row: any) => boolean)[] = [];
      const index: any = {
        eq: (key: string, value: any) => {
          predicates.push((row) => row[key] === value);
          return index;
        },
        lte: (key: string, value: any) => {
          predicates.push((row) => row[key] <= value);
          return index;
        },
      };
      const rows = () =>
        (tables[table] ?? []).filter((row) =>
          predicates.every((predicate) => predicate(row)),
        );
      const query: any = {
        withIndex: (_name: string, build: any) => {
          build?.(index);
          return query;
        },
        unique: async () => {
          const result = rows();
          if (result.length > 1) throw new Error("Not unique");
          return result[0] ?? null;
        },
        first: async () => rows()[0] ?? null,
        collect: async () => rows(),
        take: async (n: number) => rows().slice(0, n),
      };
      return query;
    },
  };
  const ctx: any = {
    db,
    auth: { getUserIdentity: async () => ({ subject: "c1" }) },
    scheduler: { runAfter: jest.fn(async () => "scheduled") },
  };
  return {
    ctx,
    tables,
    queue: () => queueListActivity(ctx, "l1" as any, "u1" as any),
  };
}

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("household activity lifecycle", () => {
  it("batches across household lists and routes to the latest changed list", async () => {
    const { ctx, tables, queue } = fixture();
    tables.lists.push({ _id: "l2", householdId: "h1", isArchived: false });
    await queue();
    await queueListActivity(ctx, "l2" as any, "u1" as any);
    expect(tables.notificationReminders).toHaveLength(1);
    expect(tables.notificationReminders[0].listId).toBe("l2");
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
  });

  it("batches changes, excludes the actor, and claims a batch only once", async () => {
    const { ctx, tables, queue } = fixture();
    await queue();
    await queue();
    expect(tables.notificationReminders).toHaveLength(1);
    const row = tables.notificationReminders[0];
    expect(row).toMatchObject({ userId: "u2", scheduledFor: NOW + 300000 });
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
    expect(
      await handler(claim)(ctx, {
        reminderId: row._id,
        scheduledFor: row.scheduledFor,
      }),
    ).toBeNull();
    jest.spyOn(Date, "now").mockReturnValue(row.scheduledFor);
    expect(
      await handler(claim)(ctx, {
        reminderId: row._id,
        scheduledFor: row.scheduledFor,
      }),
    ).toMatchObject({
      tokens: ["ExpoPushToken[test]"],
      kind: "list_activity",
      recipientClerkId: "c2",
    });
    expect(
      await handler(claim)(ctx, {
        reminderId: row._id,
        scheduledFor: row.scheduledFor,
      }),
    ).toBeNull();
    await queue();
    expect(tables.notificationReminders).toHaveLength(1);
    expect(row.scheduledFor).toBe(NOW + 600000);
  });

  it("does not treat reminder consent as activity consent", async () => {
    const { tables, queue } = fixture();
    delete tables.userPreferences[1].householdActivityEnabled;
    await queue();
    expect(tables.notificationReminders).toHaveLength(0);
  });

  it.each([
    "optout",
    "recipient_left",
    "actor_left",
    "archived",
    "deleted",
    "device_disabled",
    "device_reassigned",
    "expired",
  ])("rechecks %s before delivery", async (reason) => {
    const { ctx, tables, queue } = fixture();
    await queue();
    const row = tables.notificationReminders[0];
    jest
      .spyOn(Date, "now")
      .mockReturnValue(
        reason === "expired" ? NOW + 25 * 3600000 : row.scheduledFor,
      );
    if (reason === "optout")
      tables.userPreferences[1].householdActivityEnabled = false;
    if (reason === "recipient_left") tables.householdMembers.pop();
    if (reason === "actor_left") tables.householdMembers.shift();
    if (reason === "archived") tables.lists[0].isArchived = true;
    if (reason === "deleted") tables.lists = [];
    if (reason === "device_disabled") tables.pushTokens[0].disabledAt = NOW;
    if (reason === "device_reassigned") tables.pushTokens[0].userId = "u1";
    expect(
      await handler(claim)(ctx, {
        reminderId: row._id,
        scheduledFor: row.scheduledFor,
      }),
    ).toBeNull();
    expect(row.status).toBe("cancelled");
  });

  it("completion replaces pending edits and deduplicates offline completion replay", async () => {
    const { ctx, tables, queue } = fixture();
    await queue();
    const args = {
      householdId: "h1",
      listId: "l1",
      operationId: "finish-1",
      sessionDate: NOW,
      items: [],
    };
    const first = await handler(completeOffline)(ctx, args);
    const second = await handler(completeOffline)(ctx, args);
    expect(second).toMatchObject({
      sessionId: first.sessionId,
      alreadyCompleted: true,
    });
    expect(
      tables.notificationReminders.map((row) => [row.kind, row.status]),
    ).toEqual([
      ["list_activity", "cancelled"],
      ["shop_completed", "pending"],
    ]);
    const row = tables.notificationReminders[1];
    expect(
      await handler(claim)(ctx, {
        reminderId: row._id,
        scheduledFor: row.scheduledFor,
      }),
    ).toMatchObject({ kind: "shop_completed" });
  });

  it("holds overnight activity until 08:00 and combines the overnight batch", async () => {
    jest.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 20, 20));
    const { tables, queue } = fixture();
    await queue();
    await queue();
    expect(tables.notificationReminders).toHaveLength(1);
    expect(tables.notificationReminders[0].scheduledFor).toBe(
      Date.UTC(2026, 8, 21, 7),
    );
  });

  it("cancels pending activity when opting out, even if subsequently re-enabled", async () => {
    const { ctx, tables, queue } = fixture();
    await queue();
    ctx.auth.getUserIdentity = async () => ({ subject: "c2" });
    await handler(updatePreferences)(ctx, { householdActivityEnabled: false });
    await handler(updatePreferences)(ctx, { householdActivityEnabled: true });
    expect(tables.notificationReminders[0].status).toBe("cancelled");
  });

  it("hooks actual item changes but ignores idempotent offline replays", async () => {
    const { ctx, tables } = fixture();
    const added = await handler(add)(ctx, {
      listId: "l1",
      clientId: "offline-1",
      name: "Milk",
    });
    await handler(add)(ctx, {
      listId: "l1",
      clientId: "offline-1",
      name: "Milk",
    });
    expect(tables.items).toHaveLength(1);
    expect(tables.notificationReminders).toHaveLength(1);
    const row = tables.notificationReminders[0];
    row.status = "sent";
    await handler(setCompleted)(ctx, {
      itemId: added.itemId,
      isCompleted: false,
    });
    await handler(update)(ctx, { itemId: added.itemId, name: "Milk" });
    expect(row.status).toBe("sent");
    await handler(setCompleted)(ctx, {
      itemId: added.itemId,
      isCompleted: true,
    });
    expect(row.status).toBe("pending");
    row.status = "sent";
    await handler(setCompleted)(ctx, {
      itemId: added.itemId,
      isCompleted: false,
    });
    expect(row.status).toBe("pending");
    row.status = "sent";
    await handler(update)(ctx, { itemId: added.itemId, quantity: 2 });
    expect(row.status).toBe("pending");
    row.status = "sent";
    await handler(remove)(ctx, { itemId: added.itemId });
    expect(row.status).toBe("pending");
  });

  it("sends private copy and tracks receipts without resending accepted tokens", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok", id: "ticket" }] }),
    } as Response);
    const ctx = {
      runMutation: jest.fn(async () => ({
        tokens: ["token"],
        kind: "list_activity",
        listId: "l1",
        householdId: "h1",
        recipientClerkId: "c2",
      })),
      scheduler: { runAfter: jest.fn() },
    };
    await handler(send)(ctx, { reminderId: "r1", scheduledFor: NOW });
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body[0]).toMatchObject({
      title: "Your household has list updates",
      data: { recipientClerkId: "c2", householdId: "h1" },
    });
    expect(JSON.stringify(body)).not.toContain("Milk");
    expect(ctx.scheduler.runAfter).toHaveBeenCalledWith(
      900000,
      expect.anything(),
      { ticketId: "ticket", token: "token" },
    );
  });
});

describe("registration ownership and reminder recovery", () => {
  it("restores disabled registrations and retires rotated device tokens", async () => {
    const { ctx, tables } = fixture();
    tables.pushTokens[0].disabledAt = NOW;
    await handler(registerDevice)(ctx, {
      expectedClerkId: "c1",
      restoreOnly: true,
      platform: "ios",
      deviceId: "d1",
      token: "ExpoPushToken[new]",
    });
    expect(tables.pushTokens[0].disabledAt).toBeDefined();
    expect(tables.pushTokens[1]).toMatchObject({
      userId: "u1",
      token: "ExpoPushToken[new]",
    });
    tables.pushTokens[1].disabledAt = NOW;
    await handler(registerDevice)(ctx, {
      expectedClerkId: "c1",
      restoreOnly: true,
      platform: "ios",
      deviceId: "d1",
      token: "ExpoPushToken[new]",
    });
    expect(tables.pushTokens[1].disabledAt).toBeUndefined();
  });

  it("revives cancelled planning reminders when a disabled device returns", async () => {
    const { ctx, tables } = fixture();
    tables.pushTokens[0].userId = "u1";
    tables.pushTokens[0].disabledAt = NOW;
    tables.householdProducts.push({
      _id: "product1",
      householdId: "h1",
      displayName: "Milk",
      status: "active",
      cadenceDays: 1,
      lastPurchasedAt: NOW - 3 * 86400000,
      createdAt: NOW - 10 * 86400000,
      purchaseObservationCount: 2,
    });
    await recalculateHouseholdReminders(ctx, "h1" as any);
    const row = tables.notificationReminders.find((r) => r.userId === "u1");
    row.status = "cancelled";
    await handler(registerDevice)(ctx, {
      expectedClerkId: "c1",
      restoreOnly: true,
      platform: "ios",
      deviceId: "d1",
      token: "ExpoPushToken[test]",
    });
    expect(row.status).toBe("pending");
  });

  it("rejects stale account registration before writing", async () => {
    const { ctx } = fixture();
    await expect(
      handler(registerDevice)(ctx, {
        expectedClerkId: "c2",
        restoreOnly: true,
        platform: "ios",
        token: "ExpoPushToken[test]",
      }),
    ).rejects.toThrow("account changed");
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("keeps opted-out accounts disabled and removes previous account ownership", async () => {
    const { ctx, tables } = fixture();
    tables.userPreferences[0].restockNotificationsEnabled = false;
    tables.userPreferences[0].householdActivityEnabled = false;
    await handler(registerDevice)(ctx, {
      expectedClerkId: "c1",
      restoreOnly: true,
      platform: "ios",
      deviceId: "d1",
      token: "ExpoPushToken[test]",
    });
    expect(tables.pushTokens[0]).toMatchObject({
      userId: "u1",
      disabledAt: NOW,
    });
  });

  it.each([
    "cancelled",
    "sent",
    "failed",
    "cancelled_after_send",
    "pending_retry",
  ])("recalculates %s safely", async (status) => {
    const { ctx, tables } = fixture();
    tables.householdProducts.push({
      _id: "product1",
      householdId: "h1",
      displayName: "Milk",
      status: "active",
      cadenceDays: 1,
      lastPurchasedAt: NOW - 3 * 86400000,
      createdAt: NOW - 10 * 86400000,
      purchaseObservationCount: 2,
    });
    await recalculateHouseholdReminders(ctx, "h1" as any);
    const row = tables.notificationReminders.find((r) => r.userId === "u1");
    row.status =
      status === "cancelled_after_send"
        ? "cancelled"
        : status === "pending_retry"
          ? "pending"
          : status;
    if (status === "cancelled_after_send") row.sentAt = NOW - 1000;
    if (status === "pending_retry") {
      row.attemptCount = 1;
      row.scheduledFor = NOW + 1000;
    }
    const oldSchedule = row.scheduledFor;
    await recalculateHouseholdReminders(ctx, "h1" as any);
    expect(row.status).toBe(
      status === "cancelled" || status === "pending_retry"
        ? "pending"
        : status === "cancelled_after_send"
          ? "cancelled"
          : status,
    );
    if (status === "cancelled") expect(row.attemptCount).toBe(0);
    if (status === "pending_retry") expect(row.scheduledFor).toBe(oldSchedule);
    expect(tables.notificationReminders).toHaveLength(2);
  });
});


describe("scheduled shop reminders", () => {
  const HOUR = 60 * 60 * 1000;

  async function scheduledFixture(plannedFor = NOW + 2 * HOUR) {
    const f = fixture();
    f.tables.pushTokens.push({ _id: "t2", userId: "u1", token: "ExpoPushToken[owner]" });
    await handler(setNextShop)(f.ctx, { listId: "l1", plannedFor });
    return f;
  }

  it("atomically schedules every opted-in member one hour before a shop without regulars", async () => {
    const { ctx, tables } = await scheduledFixture();
    expect(tables.householdProducts).toHaveLength(0);
    expect(tables.notificationReminders).toHaveLength(2);
    for (const row of tables.notificationReminders) {
      expect(row).toMatchObject({ kind: "shop_reminder", status: "pending", scheduledFor: NOW + HOUR });
    }
    expect(tables.notificationReminders.map(r => r.userId).sort()).toEqual(["u1", "u2"]);
    expect(await handler(getDueDeliveries)(ctx, { now: NOW + HOUR - 1 })).toEqual([]);
    const due = await handler(getDueDeliveries)(ctx, { now: NOW + HOUR });
    expect(due).toHaveLength(2);
    expect(due.every((r: any) => r.action === "send" && r.candidateCount === 0)).toBe(true);
    expect(await handler(authorizeDeliveryRetry)(ctx, {
      reminderId: tables.notificationReminders[0]._id,
      token: "ExpoPushToken[owner]", now: NOW + HOUR,
    })).toMatchObject({ kind: "shop_reminder", candidateCount: 0 });
  });

  it("makes short-notice shops due now and ignores shops in the past", async () => {
    const { ctx, tables } = await scheduledFixture(NOW + HOUR / 2);
    expect(tables.notificationReminders.every(r => r.scheduledFor === NOW)).toBe(true);
    await handler(setNextShop)(ctx, { listId: "l1", plannedFor: NOW - 1 });
    expect(tables.notificationReminders.every(r => r.status === "cancelled")).toBe(true);
  });

  it("reschedules atomically, deduplicates repeated saves, and never revives a sent reminder", async () => {
    const { ctx, tables } = await scheduledFixture();
    await handler(setNextShop)(ctx, { listId: "l1", plannedFor: NOW + 3 * HOUR });
    expect(tables.notificationReminders.slice(0, 2).every(r => r.status === "cancelled")).toBe(true);
    expect(tables.notificationReminders.slice(2).every(r => r.scheduledFor === NOW + 2 * HOUR)).toBe(true);
    tables.notificationReminders[2].status = "sent";
    tables.notificationReminders[2].sentAt = NOW;
    await handler(setNextShop)(ctx, { listId: "l1", plannedFor: NOW + 3 * HOUR });
    expect(tables.notificationReminders).toHaveLength(4);
    expect(tables.notificationReminders[2].status).toBe("sent");
  });

  it.each(["archived", "completed", "date_removed", "date_changed", "expired", "opted_out", "left_household", "device_disabled"])(
    "blocks stale delivery and retry when %s", async reason => {
      const { ctx, tables } = await scheduledFixture();
      const row = tables.notificationReminders.find(r => r.userId === "u1");
      let now = NOW + HOUR;
      if (reason === "archived") tables.lists[0].isArchived = true;
      if (reason === "completed") tables.households[0].activeListId = undefined;
      if (reason === "date_removed") tables.lists[0].plannedFor = undefined;
      if (reason === "date_changed") tables.lists[0].plannedFor += HOUR;
      if (reason === "expired") now = NOW + 2 * HOUR;
      if (reason === "opted_out") tables.userPreferences[0].restockNotificationsEnabled = false;
      if (reason === "left_household") tables.householdMembers.splice(0, 1);
      if (reason === "device_disabled") tables.pushTokens[1].disabledAt = NOW;
      const due = await handler(getDueDeliveries)(ctx, { now });
      expect(due.find((r: any) => r.reminderId === row._id)).toMatchObject({ action: "cancel" });
      expect(await handler(authorizeDeliveryRetry)(ctx, {
        reminderId: row._id, token: "ExpoPushToken[owner]", now,
      })).toBeNull();
    },
  );

  it("uses shop-specific private copy with the scheduled local time", async () => {
    const { ctx } = await scheduledFixture();
    const deliveries = await handler(getDueDeliveries)(ctx, { now: NOW + HOUR });
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true, status: 200, json: async () => ({ data: [{ status: "ok", id: "ticket" }] }),
    } as Response);
    await handler(sendDueReminders)({
      runQuery: jest.fn(async () => deliveries.slice(0, 1)),
      runMutation: jest.fn(async () => undefined),
      scheduler: { runAfter: jest.fn(async () => undefined) },
    }, {});
    const message = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))[0];
    expect(message.title).toBe("Your household shop is coming up");
    expect(message.body).toContain("Sunday");
    expect(message.body).toContain("15:00");
    expect(message.body).not.toContain("quick check");
    expect(message.data.kind).toBe("shop_reminder");
  });
});
