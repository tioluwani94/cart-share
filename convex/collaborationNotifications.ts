import { v } from "convex/values";
import { nextActivityDeliveryTime } from "../lib/notificationSchedule";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";

const WINDOW_MS = 5 * 60 * 1000;
const isActivity = (kind: string) =>
  kind === "list_activity" || kind === "shop_completed";

/** Called within the authorized source mutation: no alert can outlive a rollback. */
export async function queueListActivity(
  ctx: MutationCtx,
  listId: Id<"lists">,
  actorId: Id<"users">,
  shoppingSessionId?: Id<"shoppingSessions">,
): Promise<void> {
  const list = await ctx.db.get(listId);
  if (!list || (list.isArchived && !shoppingSessionId)) return;
  const now = Date.now();
  const members = await ctx.db
    .query("householdMembers")
    .withIndex("by_household", (q) => q.eq("householdId", list.householdId))
    .take(3);
  for (const member of members) {
    if (member.userId === actorId) continue;
    const preference = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", member.userId))
      .unique();
    if (!preference?.householdActivityEnabled) continue;
    const activityKey = `${member.userId}:${list.householdId}:list_activity`;
    const pendingActivity = await ctx.db
      .query("notificationReminders")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", activityKey))
      .unique();
    if (
      shoppingSessionId &&
      pendingActivity?.status === "pending" &&
      pendingActivity.listId === listId
    ) {
      await ctx.db.patch(pendingActivity._id, {
        status: "cancelled",
        updatedAt: now,
      });
    }
    const dedupeKey = shoppingSessionId
      ? `${member.userId}:${shoppingSessionId}:shop_completed`
      : activityKey;
    const existing = shoppingSessionId
      ? await ctx.db
          .query("notificationReminders")
          .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", dedupeKey))
          .unique()
      : pendingActivity;
    // One completion per session; one trailing batch per household, never a sliding
    // debounce that can postpone delivery indefinitely during a long shop.
    if (existing && shoppingSessionId) continue;
    if (existing?.status === "pending") {
      // Consolidate changes across lists and open the most recently edited one.
      await ctx.db.patch(existing._id, { listId, actorId, updatedAt: now });
      continue;
    }
    const scheduledFor = nextActivityDeliveryTime(
      Math.max(
        now + (shoppingSessionId ? 0 : WINDOW_MS),
        (existing?.sentAt ?? 0) + WINDOW_MS,
      ),
      preference.notificationTimeZone,
    );
    const fields = {
      userId: member.userId,
      householdId: list.householdId,
      listId,
      actorId,
      shoppingSessionId,
      kind: shoppingSessionId
        ? ("shop_completed" as const)
        : ("list_activity" as const),
      dedupeKey,
      scheduledFor,
      status: "pending" as const,
      sentAt: undefined,
      expoTicketId: undefined,
      attemptCount: 0,
      updatedAt: now,
    };
    const reminderId = existing
      ? existing._id
      : await ctx.db.insert("notificationReminders", {
          ...fields,
          createdAt: now,
        });
    if (existing) await ctx.db.patch(existing._id, fields);
    await ctx.scheduler.runAfter(
      Math.max(0, scheduledFor - now),
      internal.collaborationNotifications.send,
      {
        reminderId,
        scheduledFor,
      },
    );
  }
}

const deliveryArgs = {
  reminderId: v.id("notificationReminders"),
  scheduledFor: v.number(),
};
const deliveryValidator = v.union(
  v.null(),
  v.object({
    tokens: v.array(v.string()),
    kind: v.union(v.literal("list_activity"), v.literal("shop_completed")),
    listId: v.id("lists"),
    householdId: v.id("households"),
    recipientClerkId: v.string(),
  }),
);

// Claim atomically before the external request. Ambiguous network failures are
// not retried: coordination alerts favor avoiding duplicates over guaranteed delivery.
export const claim = internalMutation({
  args: deliveryArgs,
  returns: deliveryValidator,
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.reminderId);
    const now = Date.now();
    if (
      !row ||
      !isActivity(row.kind) ||
      row.status !== "pending" ||
      row.scheduledFor !== args.scheduledFor ||
      row.scheduledFor > now
    )
      return null;
    const preference = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", row.userId))
      .unique();
    const member = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", row.householdId).eq("userId", row.userId),
      )
      .unique();
    const actor = row.actorId
      ? await ctx.db
          .query("householdMembers")
          .withIndex("by_household_and_user", (q) =>
            q.eq("householdId", row.householdId).eq("userId", row.actorId!),
          )
          .unique()
      : null;
    const list = row.listId ? await ctx.db.get(row.listId) : null;
    const user = await ctx.db.get(row.userId);
    const session = row.shoppingSessionId
      ? await ctx.db.get(row.shoppingSessionId)
      : null;
    if (
      !member ||
      !actor ||
      !user ||
      row.actorId === row.userId ||
      !preference?.householdActivityEnabled ||
      !list ||
      list.householdId !== row.householdId ||
      (row.kind === "list_activity"
        ? list.isArchived
        : session?.listId !== list._id ||
          session?.householdId !== row.householdId) ||
      now - row.updatedAt > 24 * 60 * 60 * 1000
    ) {
      await ctx.db.patch(row._id, { status: "cancelled", updatedAt: now });
      return null;
    }
    const allowedAt = nextActivityDeliveryTime(
      now,
      preference.notificationTimeZone,
    );
    if (allowedAt > now) {
      await ctx.db.patch(row._id, { scheduledFor: allowedAt });
      await ctx.scheduler.runAfter(
        allowedAt - now,
        internal.collaborationNotifications.send,
        {
          reminderId: row._id,
          scheduledFor: allowedAt,
        },
      );
      return null;
    }
    const devices = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", row.userId))
      .take(100);
    const tokens = devices
      .filter((token) => token.disabledAt === undefined)
      .map((token) => token.token);
    await ctx.db.patch(row._id, {
      status: tokens.length ? "sent" : "cancelled",
      sentAt: tokens.length ? now : undefined,
      updatedAt: now,
    });
    return tokens.length
      ? {
          tokens,
          kind: row.kind as "list_activity" | "shop_completed",
          listId: list._id,
          householdId: row.householdId,
          recipientClerkId: user.clerkId,
        }
      : null;
  },
});

export const send = internalAction({
  args: deliveryArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.runMutation(
      internal.collaborationNotifications.claim,
      args,
    );
    if (!delivery) return null;
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          delivery.tokens.map((to) => ({
            to,
            channelId: "household-activity",
            title:
              delivery.kind === "shop_completed"
                ? "Your household finished a shop"
                : "Your household has list updates",
            body:
              delivery.kind === "shop_completed"
                ? "Open OurPantry to see the completed shop."
                : "Open OurPantry to see the latest list.",
            data: {
              url: "ourpantry://household-activity",
              kind: delivery.kind,
              listId: delivery.listId,
              householdId: delivery.householdId,
              recipientClerkId: delivery.recipientClerkId,
            },
          })),
        ),
      });
      if (!response.ok) throw new Error("Push submission failed");
      const payload = (await response.json()) as {
        data?: { status?: string; id?: string; details?: { error?: string } }[];
      };
      let accepted = false;
      for (const [index, ticket] of (payload.data ?? []).entries()) {
        const token = delivery.tokens[index];
        if (!token) continue;
        if (ticket.status === "ok" && ticket.id) {
          accepted = true;
          await ctx.scheduler.runAfter(
            15 * 60 * 1000,
            internal.notifications.checkDeliveryReceipt,
            { ticketId: ticket.id, token },
          );
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          await ctx.runMutation(internal.notifications.disableTokenInternal, {
            token,
          });
        }
      }
      if (!accepted)
        await ctx.runMutation(
          internal.collaborationNotifications.recordFailure,
          args,
        );
    } catch {
      await ctx.runMutation(
        internal.collaborationNotifications.recordFailure,
        args,
      );
    }
    return null;
  },
});

export const recordFailure = internalMutation({
  args: deliveryArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.reminderId);
    if (
      row &&
      isActivity(row.kind) &&
      row.status === "sent" &&
      row.scheduledFor === args.scheduledFor
    ) {
      await ctx.db.patch(row._id, { status: "failed", updatedAt: Date.now() });
    }
    return null;
  },
});
