import type { Id } from "./_generated/dataModel";
import {
  authorizeDeliveryRetry,
  buildServerAnalyticsPayload,
  canRetryPushDelivery,
  checkDeliveryReceipt,
  disableAllDevices,
  excludeProductsAlreadyPlanned,
  finalizeRateLimitedDelivery,
  getPreferences,
  getDueDeliveries,
  pairAcceptedPushTickets,
  pairRateLimitedPushTickets,
  recordDeliveryResult,
  retryRateLimitedDelivery,
  sendDueReminders,
} from "./notifications";

type GetPreferencesHandler = (
  ctx: unknown,
  args: Record<string, never>,
) => Promise<unknown>;

const readPreferences = (
  getPreferences as unknown as { _handler: GetPreferencesHandler }
)._handler;

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

type CheckDeliveryReceiptHandler = (
  ctx: unknown,
  args: {
    ticketId: string;
    token: string;
    reminderId?: Id<"notificationReminders">;
    attempt?: number;
    message?: {
      title: string;
      body: string;
      data: { url: string; kind: "restock_review" | "shop_reminder" };
    };
    finalizeReminderOnRateLimit?: boolean;
  },
) => Promise<void>;

const checkExpoDeliveryReceipt = (
  checkDeliveryReceipt as unknown as {
    _handler: CheckDeliveryReceiptHandler;
  }
)._handler;

type RetryRateLimitedDeliveryHandler = (
  ctx: unknown,
  args: {
    token: string;
    reminderId: Id<"notificationReminders">;
    attempt: number;
    finalizeReminderOnRateLimit?: boolean;
  },
) => Promise<void>;

const retryExpoDelivery = (
  retryRateLimitedDelivery as unknown as {
    _handler: RetryRateLimitedDeliveryHandler;
  }
)._handler;

type AuthorizeDeliveryRetryHandler = (
  ctx: unknown,
  args: {
    reminderId: Id<"notificationReminders">;
    token: string;
    now: number;
  },
) => Promise<{
  kind: "restock_review" | "shop_reminder";
  candidateCount: number;
  plannedDay: string;
} | null>;

const readDeliveryRetryAuthorization = (
  authorizeDeliveryRetry as unknown as {
    _handler: AuthorizeDeliveryRetryHandler;
  }
)._handler;

type SendDueRemindersHandler = (
  ctx: unknown,
  args: Record<string, never>,
) => Promise<void>;

const sendDueExpoReminders = (
  sendDueReminders as unknown as { _handler: SendDueRemindersHandler }
)._handler;

type RecordDeliveryResultHandler = (
  ctx: unknown,
  args: {
    reminderId: Id<"notificationReminders">;
    accepted: boolean;
    transient: boolean;
    scheduledTokenRetry?: boolean;
    retryHoldUntil?: number;
    expoTicketId?: string;
  },
) => Promise<void>;

const recordExpoDeliveryResult = (
  recordDeliveryResult as unknown as {
    _handler: RecordDeliveryResultHandler;
  }
)._handler;

type FinalizeRateLimitedDeliveryHandler = (
  ctx: unknown,
  args: {
    reminderId: Id<"notificationReminders">;
    now: number;
    expectedScheduledFor: number;
  },
) => Promise<void>;

const finalizeExpoRateLimitedDelivery = (
  finalizeRateLimitedDelivery as unknown as {
    _handler: FinalizeRateLimitedDeliveryHandler;
  }
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

describe("notifications.getPreferences", () => {
  it("returns neutral preferences while an authenticated user is being recreated", async () => {
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "clerk_1" }) },
      db: {
        query: () => ({
          withIndex: () => ({
            unique: async () => null,
          }),
        }),
      },
    };

    await expect(readPreferences(ctx, {})).resolves.toEqual({
      analyticsConsent: undefined,
      restockNotificationsEnabled: false,
      notificationTimeMinutesLocal: 18 * 60,
      notificationTimeZone: "Europe/London",
      viewerClerkId: "clerk_1",
    });
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

describe("pairAcceptedPushTickets", () => {
  it("keeps every accepted Expo ticket paired with its device token", () => {
    expect(
      pairAcceptedPushTickets(
        ["ExponentPushToken[first]", "ExponentPushToken[second]"],
        [
          { status: "ok", id: "ticket_1" },
          { status: "ok", id: "ticket_2" },
        ],
      ),
    ).toEqual([
      { ticketId: "ticket_1", token: "ExponentPushToken[first]" },
      { ticketId: "ticket_2", token: "ExponentPushToken[second]" },
    ]);
  });

  it("keeps token indexes aligned across mixed and incomplete tickets", () => {
    expect(
      pairAcceptedPushTickets(
        [
          "ExponentPushToken[first]",
          "ExponentPushToken[rejected]",
          "ExponentPushToken[incomplete]",
        ],
        [
          { status: "ok", id: "ticket_1" },
          { status: "error", details: { error: "MessageTooBig" } },
          { status: "ok" },
          { status: "ok", id: "ticket_without_token" },
        ],
      ),
    ).toEqual([
      { ticketId: "ticket_1", token: "ExponentPushToken[first]" },
    ]);
  });
});

describe("pairRateLimitedPushTickets", () => {
  it("keeps every rate-limited Expo ticket paired with its device token", () => {
    expect(
      pairRateLimitedPushTickets(
        [
          "ExponentPushToken[accepted]",
          "ExponentPushToken[rate-limited]",
          "ExponentPushToken[invalid]",
        ],
        [
          { status: "ok", id: "ticket_1" },
          {
            status: "error",
            details: { error: "MessageRateExceeded" },
          },
          {
            status: "error",
            details: { error: "DeviceNotRegistered" },
          },
        ],
      ),
    ).toEqual(["ExponentPushToken[rate-limited]"]);
  });
});

describe("canRetryPushDelivery", () => {
  const eligible = {
    reminderStatus: "sent" as const,
    membershipExists: true,
    notificationsEnabled: true,
    tokenBelongsToRecipient: true,
    tokenEnabled: true,
    unresolvedCandidateCount: 2,
  };

  it("allows a retry only while every send-time condition remains valid", () => {
    expect(canRetryPushDelivery(eligible)).toBe(true);
    expect(
      canRetryPushDelivery({ ...eligible, membershipExists: false }),
    ).toBe(false);
    expect(
      canRetryPushDelivery({ ...eligible, notificationsEnabled: false }),
    ).toBe(false);
    expect(
      canRetryPushDelivery({ ...eligible, tokenBelongsToRecipient: false }),
    ).toBe(false);
    expect(canRetryPushDelivery({ ...eligible, tokenEnabled: false })).toBe(
      false,
    );
    expect(
      canRetryPushDelivery({ ...eligible, unresolvedCandidateCount: 0 }),
    ).toBe(false);
    expect(
      canRetryPushDelivery({ ...eligible, reminderStatus: "cancelled" }),
    ).toBe(false);
  });
});

describe("buildServerAnalyticsPayload", () => {
  it("disables GeoIP enrichment for every server event", () => {
    expect(
      buildServerAnalyticsPayload("project_key", "notification sent", "user_1", {
        household_id: "household_1",
        $geoip_disable: false,
      }),
    ).toEqual({
      api_key: "project_key",
      event: "notification sent",
      distinct_id: "user_1",
      properties: {
        household_id: "household_1",
        $geoip_disable: true,
      },
    });
  });
});

describe("notifications.recordDeliveryResult", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps retry-only delivery pending until the bounded retry resolves", async () => {
    const now = Date.UTC(2026, 8, 1, 12);
    jest.spyOn(Date, "now").mockReturnValue(now);
    const reminderId = "reminder_1" as Id<"notificationReminders">;
    const patch = jest.fn(
      async (_id: string, _changes: Record<string, unknown>) => undefined,
    );

    await recordExpoDeliveryResult(
      {
        db: {
          get: async () => ({
            _id: reminderId,
            status: "pending",
            attemptCount: 0,
          }),
          patch,
        },
      },
      {
        reminderId,
        accepted: false,
        transient: false,
        scheduledTokenRetry: true,
      },
    );

    expect(patch).toHaveBeenCalledWith(
      reminderId,
      expect.objectContaining({
        attemptCount: 1,
        scheduledFor: now + 135 * 60 * 1000,
        updatedAt: now,
      }),
    );
    expect(patch.mock.calls[0]?.[1]).not.toHaveProperty("status", "sent");
  });
});

describe("notifications.finalizeRateLimitedDelivery", () => {
  it("cancels a still-pending retry when membership was removed", async () => {
    const now = Date.UTC(2026, 8, 1, 14);
    const expectedScheduledFor = now + 15 * 60 * 1000;
    const reminderId = "reminder_1" as Id<"notificationReminders">;
    const patch = jest.fn(async () => undefined);
    const ctx = {
      db: {
        get: async () => ({
          _id: reminderId,
          status: "pending",
          scheduledFor: expectedScheduledFor,
          userId: "user_1" as Id<"users">,
          householdId: "household_1" as Id<"households">,
        }),
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () =>
              table === "userPreferences"
                ? { restockNotificationsEnabled: true }
                : null,
          }),
        }),
        patch,
      },
    };

    await finalizeExpoRateLimitedDelivery(ctx, {
      reminderId,
      now,
      expectedScheduledFor,
    });

    expect(patch).toHaveBeenCalledWith(reminderId, {
      status: "cancelled",
      updatedAt: now,
    });
  });
});

describe("notifications.checkDeliveryReceipt", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retries with bounded backoff when Expo has not produced a receipt yet", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    } as Response);
    const runAfter = jest.fn(async () => undefined);

    await checkExpoDeliveryReceipt(
      {
        scheduler: { runAfter },
        runMutation: jest.fn(async () => undefined),
      },
      {
        ticketId: "ticket_1",
        token: "ExponentPushToken[first]",
      },
    );

    expect(runAfter).toHaveBeenCalledWith(
      15 * 60 * 1000,
      expect.anything(),
      {
        ticketId: "ticket_1",
        token: "ExponentPushToken[first]",
        attempt: 1,
      },
    );
  });

  it("stops retrying after the third bounded receipt retry", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    } as Response);
    const runAfter = jest.fn(async () => undefined);

    await checkExpoDeliveryReceipt(
      {
        scheduler: { runAfter },
        runMutation: jest.fn(async () => undefined),
      },
      {
        ticketId: "ticket_1",
        token: "ExponentPushToken[first]",
        attempt: 3,
      },
    );

    expect(runAfter).not.toHaveBeenCalled();
  });

  it("converts a rate-limited receipt into a single-device retry", async () => {
    const now = Date.UTC(2026, 8, 1, 12);
    jest.spyOn(Date, "now").mockReturnValue(now);
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          ticket_1: {
            status: "error",
            details: { error: "MessageRateExceeded" },
          },
        },
      }),
    } as Response);
    const runAfter = jest.fn(async () => undefined);
    const runMutation = jest.fn(async () => undefined);
    const reminderId = "reminder_1" as Id<"notificationReminders">;
    const message = {
      title: "Your next shop needs a quick check",
      body: "2 things may need a quick check before Saturday.",
      data: {
        url: "ourpantry://restock-review",
        kind: "restock_review" as const,
      },
    };

    await checkExpoDeliveryReceipt(
      {
        scheduler: { runAfter },
        runMutation,
      },
      {
        ticketId: "ticket_1",
        reminderId,
        token: "ExponentPushToken[rate-limited]",
        message,
        attempt: 3,
        finalizeReminderOnRateLimit: true,
      },
    );

    expect(runAfter).toHaveBeenCalledWith(
      15 * 60 * 1000,
      expect.anything(),
      {
        reminderId,
        token: "ExponentPushToken[rate-limited]",
        attempt: 1,
        finalizeReminderOnRateLimit: true,
      },
    );
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      reminderId,
      retryHoldUntil: now + 135 * 60 * 1000,
    });
    expect(runAfter).toHaveBeenCalledWith(
      120 * 60 * 1000,
      expect.anything(),
      {
        reminderId,
        now: now + 120 * 60 * 1000,
        expectedScheduledFor: now + 135 * 60 * 1000,
      },
    );
  });
});

describe("notifications.authorizeDeliveryRetry", () => {
  it("rejects a retry when its reminder no longer exists", async () => {
    const ctx = {
      db: {
        get: async () => null,
      },
    };

    await expect(
      readDeliveryRetryAuthorization(ctx, {
        reminderId: "reminder_1" as Id<"notificationReminders">,
        token: "ExponentPushToken[rate-limited]",
        now: Date.now(),
      }),
    ).resolves.toBeNull();
  });
});

describe("notifications.retryRateLimitedDelivery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rebuilds current copy and resets receipt polling for a replacement ticket", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ status: "ok", id: "replacement_ticket" }],
      }),
    } as Response);
    const runAfter = jest.fn(async () => undefined);
    const runMutation = jest.fn(async () => undefined);
    const reminderId = "reminder_1" as Id<"notificationReminders">;
    const refreshedMessage = {
      title: "Your next shop needs a quick check",
      body: "1 thing may need a quick check before Monday.",
      data: {
        url: "ourpantry://restock-review",
        kind: "restock_review" as const,
      },
    };

    await retryExpoDelivery(
      {
        scheduler: { runAfter },
        runMutation,
        runQuery: jest.fn(async () => ({
          kind: "restock_review" as const,
          candidateCount: 1,
          plannedDay: "Monday",
        })),
      },
      {
        reminderId,
        token: "ExponentPushToken[rate-limited]",
        attempt: 3,
      },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://exp.host/--/api/v2/push/send",
      expect.objectContaining({
        body: JSON.stringify([
          {
            to: "ExponentPushToken[rate-limited]",
            sound: "default",
            ...refreshedMessage,
          },
        ]),
      }),
    );
    expect(runAfter).toHaveBeenCalledWith(
      15 * 60 * 1000,
      expect.anything(),
      {
        ticketId: "replacement_ticket",
        reminderId,
        token: "ExponentPushToken[rate-limited]",
        attempt: 0,
      },
    );
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      reminderId,
      expoTicketId: "replacement_ticket",
    });
  });

  it("does not resend when send-time authorization no longer passes", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    await retryExpoDelivery(
      {
        scheduler: { runAfter: jest.fn(async () => undefined) },
        runMutation: jest.fn(async () => undefined),
        runQuery: jest.fn(async () => null),
      },
      {
        reminderId: "reminder_1" as Id<"notificationReminders">,
        token: "ExponentPushToken[rate-limited]",
        attempt: 1,
      },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("notifications.sendDueReminders", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("schedules a bounded single-token retry for an initial rate-limited ticket", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { status: "ok", id: "accepted_ticket" },
          {
            status: "error",
            details: { error: "MessageRateExceeded" },
          },
        ],
      }),
    } as Response);
    const reminderId = "reminder_1" as Id<"notificationReminders">;
    const runAfter = jest.fn(async () => undefined);
    const runMutation = jest.fn(async () => undefined);

    await sendDueExpoReminders(
      {
        runQuery: jest.fn(async () => [
          {
            reminderId,
            action: "send" as const,
            kind: "restock_review" as const,
            tokens: [
              "ExponentPushToken[accepted]",
              "ExponentPushToken[rate-limited]",
            ],
            candidateCount: 2,
            plannedDay: "Saturday",
            attemptCount: 0,
            analyticsConsent: "denied" as const,
            userId: "user_1" as Id<"users">,
            householdId: "household_1" as Id<"households">,
          },
        ]),
        runMutation,
        scheduler: { runAfter },
      },
      {},
    );

    expect(runAfter).toHaveBeenCalledWith(
      15 * 60 * 1000,
      expect.anything(),
      expect.objectContaining({
        reminderId,
        token: "ExponentPushToken[rate-limited]",
        attempt: 1,
      }),
    );
    expect(runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        reminderId,
        accepted: true,
        scheduledTokenRetry: true,
      }),
    );
  });

  it("keeps a retry-only delivery pending and schedules terminal finalization", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            status: "error",
            details: { error: "MessageRateExceeded" },
          },
        ],
      }),
    } as Response);
    const reminderId = "reminder_2" as Id<"notificationReminders">;
    const runAfter = jest.fn(async () => undefined);
    const runMutation = jest.fn(async () => undefined);

    await sendDueExpoReminders(
      {
        runQuery: jest.fn(async () => [
          {
            reminderId,
            action: "send" as const,
            kind: "restock_review" as const,
            tokens: ["ExponentPushToken[rate-limited]"],
            candidateCount: 1,
            plannedDay: "Saturday",
            attemptCount: 0,
            analyticsConsent: "denied" as const,
            userId: "user_1" as Id<"users">,
            householdId: "household_1" as Id<"households">,
          },
        ]),
        runMutation,
        scheduler: { runAfter },
      },
      {},
    );

    expect(runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        reminderId,
        accepted: false,
        scheduledTokenRetry: true,
      }),
    );
    expect(runAfter).toHaveBeenCalledWith(
      120 * 60 * 1000,
      expect.anything(),
      {
        reminderId,
        now: expect.any(Number),
        expectedScheduledFor: expect.any(Number),
      },
    );
  });
});
