import { v } from "convex/values";
import { DAY_MS, getRestockTiming } from "../lib/restockEngine";
import { nextLocalDeliveryTime } from "../lib/notificationSchedule";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

type ReadCtx = QueryCtx | MutationCtx;

export function excludeProductsAlreadyPlanned<
  ProductId,
  Product extends { _id: ProductId },
  Item extends { householdProductId?: ProductId },
>(products: readonly Product[], activeItems: readonly Item[]): Product[] {
  const plannedProductIds = new Set(
    activeItems
      .map((item) => item.householdProductId)
      .filter((productId): productId is ProductId => productId !== undefined),
  );
  return products.filter((product) => !plannedProductIds.has(product._id));
}

async function requireCurrentUser(ctx: ReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (index) =>
      index.eq("clerkId", identity.subject),
    )
    .unique();
  if (!user) throw new Error("User not found in database");
  return user;
}

async function currentHousehold(
  ctx: ReadCtx,
  userId: Id<"users">,
): Promise<Doc<"households"> | null> {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user", (index) => index.eq("userId", userId))
    .first();
  return membership ? await ctx.db.get(membership.householdId) : null;
}

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const preference = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .unique();
    if (preference) return { ...preference, viewerClerkId: user.clerkId };
    const household = await currentHousehold(ctx, user._id);
    return {
      analyticsConsent: undefined,
      restockNotificationsEnabled: false,
      notificationTimeMinutesLocal: 18 * 60,
      notificationTimeZone:
        household?.planningTimeZone ?? "Europe/London",
      viewerClerkId: user.clerkId,
    };
  },
});

export const updatePreferences = mutation({
  args: {
    analyticsConsent: v.optional(
      v.union(v.literal("granted"), v.literal("denied")),
    ),
    restockNotificationsEnabled: v.optional(v.boolean()),
    notificationTimeMinutesLocal: v.optional(v.number()),
    notificationTimeZone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (
      args.notificationTimeMinutesLocal !== undefined &&
      (args.notificationTimeMinutesLocal < 8 * 60 ||
        args.notificationTimeMinutesLocal >= 20 * 60)
    ) {
      throw new Error("Notification time must be outside quiet hours");
    }
    if (
      args.notificationTimeZone !== undefined &&
      !args.notificationTimeZone.trim()
    ) {
      throw new Error("Notification time zone is required");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .unique();
    const household = await currentHousehold(ctx, user._id);
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("userPreferences", {
        userId: user._id,
        analyticsConsent: args.analyticsConsent,
        analyticsConsentUpdatedAt:
          args.analyticsConsent === undefined ? undefined : now,
        restockNotificationsEnabled:
          args.restockNotificationsEnabled ?? false,
        notificationTimeMinutesLocal:
          args.notificationTimeMinutesLocal ?? 18 * 60,
        notificationTimeZone:
          args.notificationTimeZone?.trim() ||
          household?.planningTimeZone ||
          "Europe/London",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const changes: Partial<Doc<"userPreferences">> & {
        updatedAt: number;
      } = { updatedAt: now };
      if (args.analyticsConsent !== undefined) {
        changes.analyticsConsent = args.analyticsConsent;
        changes.analyticsConsentUpdatedAt = now;
      }
      if (args.restockNotificationsEnabled !== undefined) {
        changes.restockNotificationsEnabled =
          args.restockNotificationsEnabled;
      }
      if (args.notificationTimeMinutesLocal !== undefined) {
        changes.notificationTimeMinutesLocal = Math.round(
          args.notificationTimeMinutesLocal,
        );
      }
      if (args.notificationTimeZone !== undefined) {
        changes.notificationTimeZone = args.notificationTimeZone.trim();
      }
      await ctx.db.patch(existing._id, changes);
    }

    if (household) {
      await recalculateHouseholdReminders(ctx, household._id);
    }
    return { success: true as const };
  },
});

export const registerDevice = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (!/^ExponentPushToken\[[^\]]+\]$/.test(args.token)) {
      throw new Error("Invalid Expo push token");
    }
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (index) => index.eq("token", args.token))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: user._id,
        platform: args.platform,
        deviceId: args.deviceId,
        lastSeenAt: now,
        disabledAt: undefined,
        updatedAt: now,
      });
      return { pushTokenId: existing._id };
    }
    const pushTokenId = await ctx.db.insert("pushTokens", {
      userId: user._id,
      token: args.token,
      platform: args.platform,
      deviceId: args.deviceId,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { pushTokenId };
  },
});

export const disableAllDevices = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .collect();
    const now = Date.now();
    await Promise.all(
      tokens.map((token) =>
        ctx.db.patch(token._id, { disabledAt: now, updatedAt: now }),
      ),
    );
    return { disabled: tokens.length };
  },
});

export const disableDevice = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, { deviceId }) => {
    const user = await requireCurrentUser(ctx);
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .collect();
    const matchingTokens = tokens.filter(
      (token) => token.deviceId === deviceId && token.disabledAt === undefined,
    );
    const now = Date.now();
    await Promise.all(
      matchingTokens.map((token) =>
        ctx.db.patch(token._id, { disabledAt: now, updatedAt: now }),
      ),
    );
    return { disabled: matchingTokens.length };
  },
});

async function cancelPendingForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  householdId: Id<"households">,
  keepDedupeKeys: Set<string> = new Set(),
): Promise<void> {
  const reminders = await ctx.db
    .query("notificationReminders")
    .withIndex("by_user", (index) => index.eq("userId", userId))
    .collect();
  const now = Date.now();
  for (const reminder of reminders) {
    if (
      reminder.householdId === householdId &&
      reminder.status === "pending" &&
      !keepDedupeKeys.has(reminder.dedupeKey)
    ) {
      await ctx.db.patch(reminder._id, {
        status: "cancelled",
        updatedAt: now,
      });
    }
  }
}

export async function recalculateHouseholdReminders(
  ctx: MutationCtx,
  householdId: Id<"households">,
): Promise<void> {
  const household = await ctx.db.get(householdId);
  if (!household) return;
  const memberships = await ctx.db
    .query("householdMembers")
    .withIndex("by_household", (index) =>
      index.eq("householdId", householdId),
    )
    .collect();
  const activeListRecord = household.activeListId
    ? await ctx.db.get(household.activeListId)
    : null;
  const activeList = activeListRecord?.isArchived ? null : activeListRecord;
  const products = await ctx.db
    .query("householdProducts")
    .withIndex("by_household_and_status", (index) =>
      index.eq("householdId", householdId).eq("status", "active"),
    )
    .collect();
  const activeItems = activeList
    ? await ctx.db
        .query("items")
        .withIndex("by_list", (index) => index.eq("listId", activeList._id))
        .collect()
    : [];
  const now = Date.now();
  const horizon =
    (activeList?.plannedFor ??
      now + Math.min(household.shoppingCadenceDays ?? 7, 7) * DAY_MS) +
    DAY_MS;
  const eligibleTimings = excludeProductsAlreadyPlanned(products, activeItems)
    .map((product) =>
      getRestockTiming({
        id: product._id,
        displayName: product.displayName,
        status: product.status,
        cadenceDays: product.cadenceDays,
        lastPurchasedAt: product.lastPurchasedAt,
        activatedAt: product.createdAt,
        reviewAfter: product.reviewAfter,
        purchaseObservationCount: product.purchaseObservationCount,
      }),
    )
    .filter((timing) => timing.expectedDueAt <= horizon);
  const earliestReviewAt =
    eligibleTimings.length > 0
      ? Math.min(...eligibleTimings.map((timing) => timing.reviewAt))
      : undefined;
  const cycleKey = `${activeList?._id ?? "no-list"}:${activeList?.plannedFor ?? "unscheduled"}`;

  for (const membership of memberships) {
    const preference = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (index) => index.eq("userId", membership.userId))
      .unique();
    if (!preference?.restockNotificationsEnabled || !earliestReviewAt) {
      await cancelPendingForUser(ctx, membership.userId, householdId);
      continue;
    }

    const desired: {
      kind: "restock_review" | "shop_reminder";
      scheduledFor: number;
    }[] = [
      {
        kind: "restock_review" as const,
        scheduledFor: nextLocalDeliveryTime({
          notBefore: Math.max(now, earliestReviewAt),
          timeMinutesLocal: preference.notificationTimeMinutesLocal,
          timeZone: preference.notificationTimeZone,
        }),
      },
    ];
    if (activeList?.plannedFor) {
      const scheduledFor = nextLocalDeliveryTime({
        notBefore: Math.max(now, activeList.plannedFor - DAY_MS),
        timeMinutesLocal: preference.notificationTimeMinutesLocal,
        timeZone: preference.notificationTimeZone,
      });
      if (scheduledFor < activeList.plannedFor) {
        desired.push({ kind: "shop_reminder", scheduledFor });
      }
    }

    const keepDedupeKeys = new Set<string>();
    for (const reminder of desired.slice(0, 2)) {
      const dedupeKey = `${membership.userId}:${householdId}:${cycleKey}:${reminder.kind}`;
      keepDedupeKeys.add(dedupeKey);
      const existing = await ctx.db
        .query("notificationReminders")
        .withIndex("by_dedupe_key", (index) =>
          index.eq("dedupeKey", dedupeKey),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("notificationReminders", {
          userId: membership.userId,
          householdId,
          kind: reminder.kind,
          scheduledFor: reminder.scheduledFor,
          dedupeKey,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      } else if (existing.status === "pending") {
        await ctx.db.patch(existing._id, {
          scheduledFor: reminder.scheduledFor,
          updatedAt: now,
        });
      }
    }
    await cancelPendingForUser(
      ctx,
      membership.userId,
      householdId,
      keepDedupeKeys,
    );
  }
}

export const recalculateForHousehold = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const household = await currentHousehold(ctx, user._id);
    if (!household) throw new Error("You do not belong to a household");
    await recalculateHouseholdReminders(ctx, household._id);
    return { success: true as const };
  },
});

export const getDueDeliveries = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const reminders = await ctx.db
      .query("notificationReminders")
      .withIndex("by_status_and_scheduled_for", (index) =>
        index.eq("status", "pending").lte("scheduledFor", now),
      )
      .take(100);

    return await Promise.all(
      reminders.map(async (reminder) => {
        const membership = await ctx.db
          .query("householdMembers")
          .withIndex("by_household_and_user", (index) =>
            index
              .eq("householdId", reminder.householdId)
              .eq("userId", reminder.userId),
          )
          .unique();
        const preference = await ctx.db
          .query("userPreferences")
          .withIndex("by_user", (index) =>
            index.eq("userId", reminder.userId),
          )
          .unique();
        if (!membership || !preference?.restockNotificationsEnabled) {
          return { reminderId: reminder._id, action: "cancel" as const };
        }

        const household = await ctx.db.get(reminder.householdId);
        const activeListRecord = household?.activeListId
          ? await ctx.db.get(household.activeListId)
          : null;
        const activeList = activeListRecord?.isArchived
          ? null
          : activeListRecord;
        const products = household
          ? await ctx.db
              .query("householdProducts")
              .withIndex("by_household_and_status", (index) =>
                index
                  .eq("householdId", household._id)
                  .eq("status", "active"),
              )
              .collect()
          : [];
        const activeItems = activeList
          ? await ctx.db
              .query("items")
              .withIndex("by_list", (index) =>
                index.eq("listId", activeList._id),
              )
              .collect()
          : [];
        const candidates = household
          ? excludeProductsAlreadyPlanned(products, activeItems).filter(
              (product) => {
              const timing = getRestockTiming({
                id: product._id,
                displayName: product.displayName,
                status: product.status,
                cadenceDays: product.cadenceDays,
                lastPurchasedAt: product.lastPurchasedAt,
                activatedAt: product.createdAt,
                reviewAfter: product.reviewAfter,
                purchaseObservationCount: product.purchaseObservationCount,
              });
              const horizon =
                (activeList?.plannedFor ??
                  now +
                    Math.min(household.shoppingCadenceDays ?? 7, 7) * DAY_MS) +
                DAY_MS;
              return timing.reviewAt <= now && timing.expectedDueAt <= horizon;
              },
            )
          : [];
        if (!household || candidates.length === 0) {
          return { reminderId: reminder._id, action: "cancel" as const };
        }

        const tokens = await ctx.db
          .query("pushTokens")
          .withIndex("by_user", (index) =>
            index.eq("userId", reminder.userId),
          )
          .collect();
        const activeTokens = tokens
          .filter((token) => token.disabledAt === undefined)
          .map((token) => token.token);
        if (activeTokens.length === 0) {
          return { reminderId: reminder._id, action: "cancel" as const };
        }

        const plannedDay = activeList?.plannedFor
          ? new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              timeZone: preference.notificationTimeZone,
            }).format(activeList.plannedFor)
          : "your next shop";
        return {
          reminderId: reminder._id,
          action: "send" as const,
          kind: reminder.kind,
          tokens: activeTokens,
          candidateCount: candidates.length,
          plannedDay,
          attemptCount: reminder.attemptCount ?? 0,
          analyticsConsent: preference.analyticsConsent,
          userId: reminder.userId,
          householdId: reminder.householdId,
        };
      }),
    );
  },
});

export const cancelDueReminder = internalMutation({
  args: { reminderId: v.id("notificationReminders") },
  handler: async (ctx, { reminderId }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder || reminder.status !== "pending") return;
    await ctx.db.patch(reminderId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

export const recordDeliveryResult = internalMutation({
  args: {
    reminderId: v.id("notificationReminders"),
    accepted: v.boolean(),
    transient: v.boolean(),
    expoTicketId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.status !== "pending") return;
    const now = Date.now();
    const attemptCount = (reminder.attemptCount ?? 0) + 1;
    if (args.accepted) {
      await ctx.db.patch(reminder._id, {
        status: "sent",
        expoTicketId: args.expoTicketId,
        attemptCount,
        sentAt: now,
        updatedAt: now,
      });
      return;
    }
    if (args.transient && attemptCount < 3) {
      await ctx.db.patch(reminder._id, {
        attemptCount,
        scheduledFor: now + 15 * 60 * 1000 * 2 ** (attemptCount - 1),
        updatedAt: now,
      });
      return;
    }
    await ctx.db.patch(reminder._id, {
      status: "failed",
      attemptCount,
      updatedAt: now,
    });
  },
});

export const disableTokenInternal = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const pushToken = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (index) => index.eq("token", token))
      .unique();
    if (!pushToken) return;
    const now = Date.now();
    await ctx.db.patch(pushToken._id, {
      disabledAt: now,
      updatedAt: now,
    });
  },
});

async function captureServerAnalytics(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST;
  if (!apiKey || !host) return;
  await fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      event,
      distinct_id: distinctId,
      properties,
    }),
  });
}

export const checkDeliveryReceipt = internalAction({
  args: { ticketId: v.string(), token: v.string() },
  handler: async (ctx, { ticketId, token }) => {
    const response = await fetch(
      "https://exp.host/--/api/v2/push/getReceipts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [ticketId] }),
      },
    );
    if (!response.ok) return;
    const payload = (await response.json()) as {
      data?: Record<
        string,
        { status?: string; details?: { error?: string } }
      >;
    };
    if (payload.data?.[ticketId]?.details?.error === "DeviceNotRegistered") {
      await ctx.runMutation(internal.notifications.disableTokenInternal, {
        token,
      });
    }
  },
});

export const sendDueReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const deliveries = await ctx.runQuery(
      internal.notifications.getDueDeliveries,
      { now: Date.now() },
    );
    for (const delivery of deliveries) {
      if (delivery.action === "cancel") {
        await ctx.runMutation(internal.notifications.cancelDueReminder, {
          reminderId: delivery.reminderId,
        });
        continue;
      }

      const body = `${delivery.candidateCount} ${delivery.candidateCount === 1 ? "thing may" : "things may"} need a quick check before ${delivery.plannedDay}.`;
      let acceptedTicketId: string | undefined;
      let transient = false;
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            delivery.tokens.map((token) => ({
              to: token,
              title: "Your next shop needs a quick check",
              body,
              sound: "default",
              data: {
                url: "cartshare://restock-review",
                kind: delivery.kind,
              },
            })),
          ),
        });
        transient = response.status === 429 || response.status >= 500;
        if (response.ok) {
          const payload = (await response.json()) as {
            data?: {
              status?: string;
              id?: string;
              details?: { error?: string };
            }[];
          };
          const tickets = payload.data ?? [];
          acceptedTicketId = tickets.find(
            (ticket) => ticket.status === "ok" && ticket.id,
          )?.id;
          for (const [index, ticket] of tickets.entries()) {
            if (ticket.details?.error === "DeviceNotRegistered") {
              await ctx.runMutation(
                internal.notifications.disableTokenInternal,
                { token: delivery.tokens[index] },
              );
            }
          }
        }
      } catch {
        transient = true;
      }

      await ctx.runMutation(internal.notifications.recordDeliveryResult, {
        reminderId: delivery.reminderId,
        accepted: acceptedTicketId !== undefined,
        transient,
        expoTicketId: acceptedTicketId,
      });
      if (acceptedTicketId) {
        const token = delivery.tokens[0];
        await ctx.scheduler.runAfter(
          15 * 60 * 1000,
          internal.notifications.checkDeliveryReceipt,
          { ticketId: acceptedTicketId, token },
        );
      }
      if (delivery.analyticsConsent === "granted") {
        await captureServerAnalytics("notification sent", delivery.userId, {
          household_id: delivery.householdId,
          kind: delivery.kind,
          delivery_result: acceptedTicketId ? "accepted" : "failed",
        });
      }
    }
  },
});
