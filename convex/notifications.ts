import { v } from "convex/values";
import { DAY_MS, getRestockTiming } from "../lib/restockEngine";
import { nextLocalDeliveryTime } from "../lib/notificationSchedule";
import type { NotificationKind } from "../lib/notificationResponse";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

type ReadCtx = QueryCtx | MutationCtx;

interface ExpoPushTicket {
  status?: string;
  id?: string;
  details?: { error?: string };
}

interface AcceptedPushTicket {
  ticketId: string;
  token: string;
}

interface ExpoPushMessage {
  title: string;
  body: string;
  data: {
    url: string;
    kind: NotificationKind;
  };
}

const expoPushMessageValidator = v.object({
  title: v.string(),
  body: v.string(),
  data: v.object({
    url: v.string(),
    kind: v.union(
      v.literal("restock_review"),
      v.literal("shop_reminder"),
      v.literal("product_learning"),
    ),
  }),
});

export function pairAcceptedPushTickets(
  tokens: readonly string[],
  tickets: readonly ExpoPushTicket[],
): AcceptedPushTicket[] {
  return tickets.flatMap((ticket, index) => {
    const token = tokens[index];
    return ticket.status === "ok" && ticket.id && token
      ? [{ ticketId: ticket.id, token }]
      : [];
  });
}

export function pairRateLimitedPushTickets(
  tokens: readonly string[],
  tickets: readonly ExpoPushTicket[],
): string[] {
  return tickets.flatMap((ticket, index) => {
    const token = tokens[index];
    return ticket.details?.error === "MessageRateExceeded" && token
      ? [token]
      : [];
  });
}

type ReminderStatus = Doc<"notificationReminders">["status"];

export function canRetryPushDelivery(args: {
  reminderStatus: ReminderStatus | undefined;
  membershipExists: boolean;
  notificationsEnabled: boolean;
  tokenBelongsToRecipient: boolean;
  tokenEnabled: boolean;
  unresolvedCandidateCount: number;
}): boolean {
  return (
    (args.reminderStatus === "pending" || args.reminderStatus === "sent") &&
    args.membershipExists &&
    args.notificationsEnabled &&
    args.tokenBelongsToRecipient &&
    args.tokenEnabled &&
    args.unresolvedCandidateCount > 0
  );
}

function buildPushMessage(args: {
  kind: NotificationKind;
  candidateCount: number;
  plannedDay: string;
}): ExpoPushMessage {
  if (args.kind === "product_learning") {
    return {
      title: "OurPantry is learning your regulars",
      body: `${args.candidateCount} ${args.candidateCount === 1 ? "product looks" : "products look"} like a household regular. Take a quick look.`,
      data: {
        url: "ourpantry://pantry?focus=learning&source=notification",
        kind: args.kind,
      },
    };
  }
  return {
    title: "Your next shop needs a quick check",
    body: `${args.candidateCount} ${args.candidateCount === 1 ? "thing may" : "things may"} need a quick check before ${args.plannedDay}.`,
    data: {
      url: "ourpantry://restock-review",
      kind: args.kind,
    },
  };
}

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
    .withIndex("by_clerk_id", (index) => index.eq("clerkId", identity.subject))
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (index) =>
        index.eq("clerkId", identity.subject),
      )
      .unique();
    if (!user) {
      return {
        analyticsConsent: undefined,
        restockNotificationsEnabled: false,
        notificationTimeMinutesLocal: 18 * 60,
        notificationTimeZone: "Europe/London",
        viewerClerkId: identity.subject,
      };
    }
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
      notificationTimeZone: household?.planningTimeZone ?? "Europe/London",
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
        restockNotificationsEnabled: args.restockNotificationsEnabled ?? false,
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
        changes.restockNotificationsEnabled = args.restockNotificationsEnabled;
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
  includeProductLearning = false,
): Promise<void> {
  const reminders = await ctx.db
    .query("notificationReminders")
    .withIndex("by_user", (index) => index.eq("userId", userId))
    .collect();
  const now = Date.now();
  for (const reminder of reminders) {
    if (
      reminder.householdId === householdId &&
      (includeProductLearning || reminder.kind !== "product_learning") &&
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

export async function scheduleProductLearningNotifications(
  ctx: MutationCtx,
  args: {
    householdId: Id<"households">;
    shoppingSessionId: Id<"shoppingSessions">;
    productIds: Id<"householdProducts">[];
    now?: number;
  },
): Promise<void> {
  if (args.productIds.length === 0) return;
  const memberships = await ctx.db
    .query("householdMembers")
    .withIndex("by_household", (index) =>
      index.eq("householdId", args.householdId),
    )
    .collect();
  const now = args.now ?? Date.now();

  for (const membership of memberships) {
    const preference = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (index) => index.eq("userId", membership.userId))
      .unique();
    if (!preference?.restockNotificationsEnabled) continue;

    const dedupeKey = `${membership.userId}:${args.householdId}:${args.shoppingSessionId}:product_learning`;
    const existing = await ctx.db
      .query("notificationReminders")
      .withIndex("by_dedupe_key", (index) => index.eq("dedupeKey", dedupeKey))
      .unique();
    if (existing) continue;

    await ctx.db.insert("notificationReminders", {
      userId: membership.userId,
      householdId: args.householdId,
      kind: "product_learning",
      productIds: args.productIds,
      scheduledFor: nextLocalDeliveryTime({
        notBefore: now,
        timeMinutesLocal: preference.notificationTimeMinutesLocal,
        timeZone: preference.notificationTimeZone,
      }),
      dedupeKey,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
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
    .withIndex("by_household", (index) => index.eq("householdId", householdId))
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
      now + Math.min(household.shoppingCadenceDays ?? 7, 7) * DAY_MS) + DAY_MS;
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
    if (!preference?.restockNotificationsEnabled) {
      await cancelPendingForUser(
        ctx,
        membership.userId,
        householdId,
        new Set(),
        true,
      );
      continue;
    }
    if (!earliestReviewAt) {
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
        .withIndex("by_dedupe_key", (index) => index.eq("dedupeKey", dedupeKey))
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

async function inspectReminderDeliveryState(
  ctx: ReadCtx,
  reminder: Doc<"notificationReminders">,
  now: number,
) {
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
    .withIndex("by_user", (index) => index.eq("userId", reminder.userId))
    .unique();
  if (!membership || !preference?.restockNotificationsEnabled) {
    return {
      membershipExists: membership !== null,
      notificationsEnabled: preference?.restockNotificationsEnabled === true,
      preference,
      household: null,
      activeList: null,
      candidateCount: 0,
    };
  }
  const household = await ctx.db.get(reminder.householdId);
  if (reminder.kind === "product_learning") {
    const learningProducts = await Promise.all(
      (reminder.productIds ?? []).map((productId) => ctx.db.get(productId)),
    );
    const candidateCount = learningProducts.filter(
      (product) =>
        product?.householdId === reminder.householdId &&
        product.status === "learning" &&
        product.purchaseObservationCount >= 2,
    ).length;
    return {
      membershipExists: true,
      notificationsEnabled: true,
      preference,
      household,
      activeList: null,
      candidateCount,
    };
  }
  const activeListRecord = household?.activeListId
    ? await ctx.db.get(household.activeListId)
    : null;
  const activeList = activeListRecord?.isArchived ? null : activeListRecord;
  const products = household
    ? await ctx.db
        .query("householdProducts")
        .withIndex("by_household_and_status", (index) =>
          index.eq("householdId", household._id).eq("status", "active"),
        )
        .collect()
    : [];
  const activeItems = activeList
    ? await ctx.db
        .query("items")
        .withIndex("by_list", (index) => index.eq("listId", activeList._id))
        .collect()
    : [];
  const candidates = household
    ? excludeProductsAlreadyPlanned(products, activeItems).filter((product) => {
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
            now + Math.min(household.shoppingCadenceDays ?? 7, 7) * DAY_MS) +
          DAY_MS;
        return timing.reviewAt <= now && timing.expectedDueAt <= horizon;
      })
    : [];

  return {
    membershipExists: membership !== null,
    notificationsEnabled: preference?.restockNotificationsEnabled === true,
    preference,
    household,
    activeList,
    candidateCount: candidates.length,
  };
}

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
        const state = await inspectReminderDeliveryState(ctx, reminder, now);
        if (
          !state.membershipExists ||
          !state.notificationsEnabled ||
          !state.household ||
          !state.preference ||
          state.candidateCount === 0
        ) {
          return { reminderId: reminder._id, action: "cancel" as const };
        }

        const tokens = await ctx.db
          .query("pushTokens")
          .withIndex("by_user", (index) => index.eq("userId", reminder.userId))
          .collect();
        const activeTokens = tokens
          .filter((token) => token.disabledAt === undefined)
          .map((token) => token.token);
        if (activeTokens.length === 0) {
          return { reminderId: reminder._id, action: "cancel" as const };
        }

        const plannedDay = state.activeList?.plannedFor
          ? new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              timeZone: state.preference.notificationTimeZone,
            }).format(state.activeList.plannedFor)
          : "your next shop";
        return {
          reminderId: reminder._id,
          action: "send" as const,
          kind: reminder.kind,
          tokens: activeTokens,
          candidateCount: state.candidateCount,
          plannedDay,
          attemptCount: reminder.attemptCount ?? 0,
          analyticsConsent: state.preference.analyticsConsent,
          userId: reminder.userId,
          householdId: reminder.householdId,
        };
      }),
    );
  },
});

export const authorizeDeliveryRetry = internalQuery({
  args: {
    reminderId: v.id("notificationReminders"),
    token: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { reminderId, token, now }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder) return null;
    const pushToken = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (index) => index.eq("token", token))
      .unique();
    const state = await inspectReminderDeliveryState(ctx, reminder, now);
    const authorized = canRetryPushDelivery({
      reminderStatus: reminder.status,
      membershipExists: state.membershipExists,
      notificationsEnabled: state.notificationsEnabled,
      tokenBelongsToRecipient: pushToken?.userId === reminder.userId,
      tokenEnabled: pushToken !== null && pushToken.disabledAt === undefined,
      unresolvedCandidateCount: state.candidateCount,
    });
    if (!authorized || !state.preference) return null;
    const plannedDay = state.activeList?.plannedFor
      ? new Intl.DateTimeFormat("en-GB", {
          weekday: "long",
          timeZone: state.preference.notificationTimeZone,
        }).format(state.activeList.plannedFor)
      : "your next shop";
    return {
      kind: reminder.kind,
      candidateCount: state.candidateCount,
      plannedDay,
    };
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

const PUSH_RECEIPT_RETRY_BASE_MS = 15 * 60 * 1000;
const PUSH_RECEIPT_MAX_RETRIES = 3;
const PUSH_RATE_LIMIT_FINALIZE_MS =
  PUSH_RECEIPT_RETRY_BASE_MS * 2 ** PUSH_RECEIPT_MAX_RETRIES;
const PUSH_RATE_LIMIT_CRON_HOLD_MS =
  PUSH_RATE_LIMIT_FINALIZE_MS + PUSH_RECEIPT_RETRY_BASE_MS;

export const recordDeliveryResult = internalMutation({
  args: {
    reminderId: v.id("notificationReminders"),
    accepted: v.boolean(),
    transient: v.boolean(),
    scheduledTokenRetry: v.optional(v.boolean()),
    retryHoldUntil: v.optional(v.number()),
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
    if (args.scheduledTokenRetry) {
      await ctx.db.patch(reminder._id, {
        attemptCount,
        scheduledFor: args.retryHoldUntil ?? now + PUSH_RATE_LIMIT_CRON_HOLD_MS,
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

export const recordRateLimitedDeliveryAccepted = internalMutation({
  args: {
    reminderId: v.id("notificationReminders"),
    expoTicketId: v.string(),
  },
  handler: async (ctx, { reminderId, expoTicketId }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder || reminder.status === "cancelled") return;
    const now = Date.now();
    await ctx.db.patch(reminderId, {
      status: "sent",
      expoTicketId,
      sentAt: now,
      updatedAt: now,
    });
  },
});

export const recordRateLimitedReceiptRetryStarted = internalMutation({
  args: {
    reminderId: v.id("notificationReminders"),
    retryHoldUntil: v.number(),
  },
  handler: async (ctx, { reminderId, retryHoldUntil }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder || reminder.status === "cancelled") return;
    await ctx.db.patch(reminderId, {
      status: "pending",
      scheduledFor: retryHoldUntil,
      updatedAt: Date.now(),
    });
  },
});

export const finalizeRateLimitedDelivery = internalMutation({
  args: {
    reminderId: v.id("notificationReminders"),
    now: v.number(),
    expectedScheduledFor: v.number(),
  },
  handler: async (ctx, { reminderId, now, expectedScheduledFor }) => {
    const reminder = await ctx.db.get(reminderId);
    if (
      !reminder ||
      reminder.status !== "pending" ||
      reminder.scheduledFor !== expectedScheduledFor
    ) {
      return;
    }
    const state = await inspectReminderDeliveryState(ctx, reminder, now);
    const status =
      state.membershipExists &&
      state.notificationsEnabled &&
      state.household &&
      state.candidateCount > 0
        ? "failed"
        : "cancelled";
    await ctx.db.patch(reminderId, { status, updatedAt: now });
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

export function buildServerAnalyticsPayload(
  apiKey: string,
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    api_key: apiKey,
    event,
    distinct_id: distinctId,
    properties: {
      ...properties,
      $geoip_disable: true,
    },
  };
}

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
    body: JSON.stringify(
      buildServerAnalyticsPayload(apiKey, event, distinctId, properties),
    ),
  });
}

async function scheduleDeliveryReceiptRetry(
  ctx: ActionCtx,
  args: {
    ticketId: string;
    token: string;
    reminderId?: Id<"notificationReminders">;
    attempt: number;
    message?: ExpoPushMessage;
    finalizeReminderOnRateLimit?: boolean;
  },
): Promise<void> {
  if (args.attempt >= PUSH_RECEIPT_MAX_RETRIES) return;
  await ctx.scheduler.runAfter(
    PUSH_RECEIPT_RETRY_BASE_MS * 2 ** args.attempt,
    internal.notifications.checkDeliveryReceipt,
    { ...args, attempt: args.attempt + 1 },
  );
}

async function scheduleRateLimitedDeliveryRetry(
  ctx: ActionCtx,
  args: {
    reminderId: Id<"notificationReminders">;
    token: string;
    attempt: number;
    finalizeReminderOnRateLimit?: boolean;
  },
): Promise<void> {
  if (args.attempt >= PUSH_RECEIPT_MAX_RETRIES) return;
  await ctx.scheduler.runAfter(
    PUSH_RECEIPT_RETRY_BASE_MS * 2 ** args.attempt,
    internal.notifications.retryRateLimitedDelivery,
    { ...args, attempt: args.attempt + 1 },
  );
}

export const retryRateLimitedDelivery = internalAction({
  args: {
    reminderId: v.id("notificationReminders"),
    token: v.string(),
    attempt: v.number(),
    finalizeReminderOnRateLimit: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { reminderId, token, attempt, finalizeReminderOnRateLimit },
  ) => {
    const retryContext = await ctx.runQuery(
      internal.notifications.authorizeDeliveryRetry,
      { reminderId, token, now: Date.now() },
    );
    if (!retryContext) return;
    const message = buildPushMessage(retryContext);

    let response: Response;
    try {
      response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ to: token, sound: "default", ...message }]),
      });
    } catch {
      await scheduleRateLimitedDeliveryRetry(ctx, {
        reminderId,
        token,
        attempt,
        finalizeReminderOnRateLimit,
      });
      return;
    }

    if (response.status === 429 || response.status >= 500) {
      await scheduleRateLimitedDeliveryRetry(ctx, {
        reminderId,
        token,
        attempt,
        finalizeReminderOnRateLimit,
      });
      return;
    }
    if (!response.ok) return;

    const payload = (await response.json()) as { data?: ExpoPushTicket[] };
    const ticket = payload.data?.[0];
    if (ticket?.details?.error === "DeviceNotRegistered") {
      await ctx.runMutation(internal.notifications.disableTokenInternal, {
        token,
      });
      return;
    }
    if (ticket?.details?.error === "MessageRateExceeded") {
      await scheduleRateLimitedDeliveryRetry(ctx, {
        reminderId,
        token,
        attempt,
        finalizeReminderOnRateLimit,
      });
      return;
    }
    if (ticket?.status === "ok" && ticket.id) {
      await ctx.runMutation(
        internal.notifications.recordRateLimitedDeliveryAccepted,
        { reminderId, expoTicketId: ticket.id },
      );
      await ctx.scheduler.runAfter(
        PUSH_RECEIPT_RETRY_BASE_MS,
        internal.notifications.checkDeliveryReceipt,
        {
          ticketId: ticket.id,
          reminderId,
          token,
          attempt: 0,
          finalizeReminderOnRateLimit,
        },
      );
    }
  },
});

export const checkDeliveryReceipt = internalAction({
  args: {
    ticketId: v.string(),
    token: v.string(),
    reminderId: v.optional(v.id("notificationReminders")),
    attempt: v.optional(v.number()),
    message: v.optional(expoPushMessageValidator),
    finalizeReminderOnRateLimit: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      ticketId,
      token,
      reminderId,
      attempt: rawAttempt,
      message,
      finalizeReminderOnRateLimit,
    },
  ) => {
    const attempt = Math.max(0, Math.floor(rawAttempt ?? 0));
    let payload: {
      data?: Record<string, { status?: string; details?: { error?: string } }>;
    };
    try {
      const response = await fetch(
        "https://exp.host/--/api/v2/push/getReceipts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [ticketId] }),
        },
      );
      if (!response.ok) {
        await scheduleDeliveryReceiptRetry(ctx, {
          ticketId,
          token,
          reminderId,
          attempt,
          message,
          finalizeReminderOnRateLimit,
        });
        return;
      }
      payload = (await response.json()) as typeof payload;
    } catch {
      await scheduleDeliveryReceiptRetry(ctx, {
        ticketId,
        token,
        reminderId,
        attempt,
        message,
        finalizeReminderOnRateLimit,
      });
      return;
    }

    const receipt = payload.data?.[ticketId];
    if (!receipt) {
      await scheduleDeliveryReceiptRetry(ctx, {
        ticketId,
        token,
        reminderId,
        attempt,
        message,
        finalizeReminderOnRateLimit,
      });
      return;
    }
    if (receipt.details?.error === "DeviceNotRegistered") {
      await ctx.runMutation(internal.notifications.disableTokenInternal, {
        token,
      });
      return;
    }
    if (receipt.details?.error === "MessageRateExceeded" && reminderId) {
      await scheduleRateLimitedDeliveryRetry(ctx, {
        reminderId,
        token,
        attempt: 0,
        finalizeReminderOnRateLimit,
      });
      if (finalizeReminderOnRateLimit) {
        const retryStartedAt = Date.now();
        const retryHoldUntil = retryStartedAt + PUSH_RATE_LIMIT_CRON_HOLD_MS;
        await ctx.runMutation(
          internal.notifications.recordRateLimitedReceiptRetryStarted,
          { reminderId, retryHoldUntil },
        );
        await ctx.scheduler.runAfter(
          PUSH_RATE_LIMIT_FINALIZE_MS,
          internal.notifications.finalizeRateLimitedDelivery,
          {
            reminderId,
            now: retryStartedAt + PUSH_RATE_LIMIT_FINALIZE_MS,
            expectedScheduledFor: retryHoldUntil,
          },
        );
      }
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

      const message = buildPushMessage(delivery);
      let acceptedTickets: AcceptedPushTicket[] = [];
      let rateLimitedTokens: string[] = [];
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
              sound: "default",
              ...message,
            })),
          ),
        });
        transient = response.status === 429 || response.status >= 500;
        if (response.ok) {
          const payload = (await response.json()) as {
            data?: ExpoPushTicket[];
          };
          const tickets = payload.data ?? [];
          acceptedTickets = pairAcceptedPushTickets(delivery.tokens, tickets);
          rateLimitedTokens = pairRateLimitedPushTickets(
            delivery.tokens,
            tickets,
          );
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

      const scheduledRateLimitedTokens =
        delivery.attemptCount < 2 ? rateLimitedTokens : [];
      const retryStartedAt = Date.now();
      const retryHoldUntil = retryStartedAt + PUSH_RATE_LIMIT_CRON_HOLD_MS;
      await Promise.all(
        scheduledRateLimitedTokens.map((token) =>
          scheduleRateLimitedDeliveryRetry(ctx, {
            reminderId: delivery.reminderId,
            token,
            attempt: 0,
            finalizeReminderOnRateLimit: delivery.tokens.length === 1,
          }),
        ),
      );
      if (
        acceptedTickets.length === 0 &&
        scheduledRateLimitedTokens.length > 0
      ) {
        await ctx.scheduler.runAfter(
          PUSH_RATE_LIMIT_FINALIZE_MS,
          internal.notifications.finalizeRateLimitedDelivery,
          {
            reminderId: delivery.reminderId,
            now: retryStartedAt + PUSH_RATE_LIMIT_FINALIZE_MS,
            expectedScheduledFor: retryHoldUntil,
          },
        );
      }
      await ctx.runMutation(internal.notifications.recordDeliveryResult, {
        reminderId: delivery.reminderId,
        accepted: acceptedTickets.length > 0,
        transient,
        scheduledTokenRetry: scheduledRateLimitedTokens.length > 0,
        retryHoldUntil:
          scheduledRateLimitedTokens.length > 0 ? retryHoldUntil : undefined,
        expoTicketId: acceptedTickets[0]?.ticketId,
      });
      await Promise.all(
        acceptedTickets.map(({ ticketId, token }) =>
          ctx.scheduler.runAfter(
            15 * 60 * 1000,
            internal.notifications.checkDeliveryReceipt,
            {
              ticketId,
              reminderId: delivery.reminderId,
              token,
              finalizeReminderOnRateLimit: delivery.tokens.length === 1,
            },
          ),
        ),
      );
      if (delivery.analyticsConsent === "granted") {
        await captureServerAnalytics("notification sent", delivery.userId, {
          household_id: delivery.householdId,
          kind: delivery.kind,
          delivery_result:
            acceptedTickets.length > 0
              ? "accepted"
              : scheduledRateLimitedTokens.length > 0
                ? "retry_scheduled"
                : "failed",
        });
      }
    }
  },
});
