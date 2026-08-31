import { v } from "convex/values";
import {
  calculateMonthlyRemaining,
  calculatePlannedTotal,
} from "../lib/budget";
import { formatMonthShort } from "../lib/formatters";
import { learnFromPurchase } from "../lib/restockEngine";
import { getUkMonthRange, getUkYearMonth } from "../lib/ukCalendar";
import { mutation, query } from "./_generated/server";

/**
 * Create a new shopping session.
 * Records a completed shopping trip with receipt information.
 * totalAmount is stored in pence (integer) when the household records it.
 */
export const create = mutation({
  args: {
    householdId: v.id("households"),
    totalAmount: v.optional(v.number()), // in pence (integer)
    storeName: v.optional(v.string()),
    listId: v.optional(v.id("lists")),
    receiptUploadId: v.optional(v.id("receiptUploads")),
    paidBy: v.optional(v.union(v.literal("joint"), v.id("users"))),
    sessionDate: v.optional(v.number()), // defaults to now if not provided
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;
    const now = Date.now();

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Validate user is a member of the household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this household");
    }

    // If listId is provided, validate it belongs to the household
    if (args.listId) {
      const list = await ctx.db.get(args.listId);
      if (!list) throw new Error("List not found");
      if (list.householdId !== args.householdId) {
        throw new Error("List does not belong to this household");
      }
    }

    if (args.paidBy && args.paidBy !== "joint") {
      const payerMembership = await ctx.db
        .query("householdMembers")
        .withIndex("by_household_and_user", (q) =>
          q
            .eq("householdId", args.householdId)
            .eq("userId", args.paidBy as typeof user._id),
        )
        .unique();
      if (!payerMembership) {
        throw new Error("Payment source is not a household member");
      }
    }

    let receiptImageId;
    if (args.receiptUploadId) {
      const receiptUpload = await ctx.db.get(args.receiptUploadId);
      if (!receiptUpload?.storageId) {
        throw new Error("Receipt upload is not complete");
      }
      if (receiptUpload.householdId !== args.householdId) {
        throw new Error("Receipt does not belong to this household");
      }
      receiptImageId = receiptUpload.storageId;
    }

    // Create the shopping session
    const sessionId = await ctx.db.insert("shoppingSessions", {
      householdId: args.householdId,
      listId: args.listId,
      totalAmount:
        args.totalAmount === undefined
          ? undefined
          : Math.round(args.totalAmount),
      storeName: args.storeName?.trim(),
      shopperId: user._id,
      paidBy: args.paidBy,
      receiptImageId,
      sessionDate: args.sessionDate ?? now,
      createdAt: now,
    });

    // Keep session creation and list completion in the same Convex transaction.
    // If either write fails, Convex rolls back both and the list stays usable.
    if (args.listId) {
      const completedItems = await ctx.db
        .query("items")
        .withIndex("by_list", (query) => query.eq("listId", args.listId!))
        .collect();
      const learnedProductIds = new Set<string>();
      for (const item of completedItems) {
        if (
          !item.isCompleted ||
          !item.householdProductId ||
          learnedProductIds.has(item.householdProductId)
        ) {
          continue;
        }
        const product = await ctx.db.get(item.householdProductId);
        if (!product || product.householdId !== args.householdId) continue;
        const learning = learnFromPurchase({
          product: {
            id: product._id,
            displayName: product.displayName,
            status: product.status,
            cadenceDays: product.cadenceDays,
            lastPurchasedAt: product.lastPurchasedAt,
            activatedAt: product.createdAt,
            reviewAfter: product.reviewAfter,
            purchaseObservationCount: product.purchaseObservationCount,
          },
          purchasedAt: args.sessionDate ?? now,
        });
        await ctx.db.patch(product._id, {
          ...learning,
          updatedAt: now,
        });
        learnedProductIds.add(product._id);
      }

      await ctx.db.patch(args.listId, {
        isArchived: true,
        updatedAt: now,
      });
      const household = await ctx.db.get(args.householdId);
      if (household?.activeListId === args.listId) {
        await ctx.db.patch(args.householdId, {
          activeListId: undefined,
          updatedAt: now,
        });
      }
    }

    return { sessionId };
  },
});

/**
 * Get all shopping sessions for a household, ordered by date (newest first).
 * Validates that the user is a member of the household.
 */
export const getByHousehold = query({
  args: {
    householdId: v.id("households"),
    limit: v.optional(v.number()), // optional limit for pagination
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Validate user is a member of the household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this household");
    }

    // Get sessions ordered by sessionDate (descending - newest first)
    const sessionsQuery = ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .order("desc");

    const sessions = args.limit
      ? await sessionsQuery.take(args.limit)
      : await sessionsQuery.collect();

    // Enrich sessions with shopper info and receipt URLs
    const sessionsWithInfo = await Promise.all(
      sessions.map(async (session) => {
        const { receiptImageId, ...publicSession } = session;
        const shopper = await ctx.db.get(session.shopperId);
        // Get receipt URL if image exists
        let receiptUrl: string | null = null;
        if (receiptImageId) {
          receiptUrl = await ctx.storage.getUrl(receiptImageId);
        }
        let plannedTotalPence = 0;
        let tripBudgetPence: number | undefined;
        if (session.listId) {
          const list = await ctx.db.get(session.listId);
          tripBudgetPence = list?.tripBudgetPence;
          const items = await ctx.db
            .query("items")
            .withIndex("by_list", (q) => q.eq("listId", session.listId!))
            .collect();
          plannedTotalPence = calculatePlannedTotal(items);
        }
        const paidByName =
          session.paidBy === "joint"
            ? "Joint account"
            : session.paidBy
              ? (await ctx.db.get(session.paidBy))?.name ?? "Household member"
              : undefined;
        return {
          ...publicSession,
          shopperName: shopper?.name ?? "Unknown",
          shopperImageUrl: shopper?.imageUrl,
          receiptUrl,
          plannedTotalPence,
          tripBudgetPence,
          paidByName,
        };
      })
    );

    // Sort by sessionDate descending (since index order may not match)
    return sessionsWithInfo.sort((a, b) => b.sessionDate - a.sessionDate);
  },
});

/**
 * Get shopping sessions within a date range for analytics.
 * Returns sessions between startDate and endDate (inclusive).
 * Validates that the user is a member of the household.
 */
export const getByDateRange = query({
  args: {
    householdId: v.id("households"),
    startDate: v.number(), // timestamp in milliseconds
    endDate: v.number(), // timestamp in milliseconds
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Validate user is a member of the household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this household");
    }

    // Get all sessions for the household
    const allSessions = await ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    // Filter by date range
    const sessionsInRange = allSessions.filter(
      (session) =>
        session.sessionDate >= args.startDate &&
        session.sessionDate <= args.endDate
    );

    // Enrich sessions with shopper info
    const sessionsWithShopperInfo = await Promise.all(
      sessionsInRange.map(async (session) => {
        const { receiptImageId: _receiptImageId, ...publicSession } = session;
        const shopper = await ctx.db.get(session.shopperId);
        return {
          ...publicSession,
          shopperName: shopper?.name ?? "Unknown",
          shopperImageUrl: shopper?.imageUrl,
        };
      })
    );

    // Sort by sessionDate descending (newest first)
    return sessionsWithShopperInfo.sort((a, b) => b.sessionDate - a.sessionDate);
  },
});

/**
 * Get total spending for a household in a given month.
 * Returns the sum of all session amounts in pence.
 */
export const getMonthlyTotal = query({
  args: {
    householdId: v.id("households"),
    year: v.number(),
    month: v.number(), // 0-indexed (0 = January, 11 = December)
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Validate user is a member of the household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this household");
    }

    // Budget months follow Europe/London calendar boundaries, including BST.
    const { start: startDate, endExclusive } = getUkMonthRange(
      args.year,
      args.month,
    );

    // Get all sessions for the household in the date range
    const allSessions = await ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    // Filter by date range and sum amounts
    const totalPence = allSessions
      .filter(
        (session) =>
          session.sessionDate >= startDate && session.sessionDate < endExclusive
      )
      .reduce((sum, session) => sum + (session.totalAmount ?? 0), 0);

    const household = await ctx.db.get(args.householdId);
    const monthlyBudgetPence = household?.monthlyBudgetPence;

    return {
      totalPence,
      totalPounds: totalPence / 100,
      monthlyBudgetPence,
      remainingPence:
        monthlyBudgetPence === undefined
          ? undefined
          : calculateMonthlyRemaining(monthlyBudgetPence, totalPence),
      sessionCount: allSessions.filter(
        (session) =>
          session.sessionDate >= startDate && session.sessionDate < endExclusive
      ).length,
    };
  },
});

/**
 * Get the count of shopping sessions for a household in the current month.
 * Used for displaying fun stats like "You've shopped X times this month!"
 */
export const getMonthlySessionCount = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Validate user is a member of the household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this household");
    }

    const currentMonth = getUkYearMonth(Date.now());
    const { start: startDate, endExclusive } = getUkMonthRange(
      currentMonth.year,
      currentMonth.month,
    );

    // Get all sessions for the household
    const allSessions = await ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    // Count sessions in current month
    const count = allSessions.filter(
      (session) =>
        session.sessionDate >= startDate && session.sessionDate < endExclusive
    ).length;

    return { count };
  },
});

/**
 * Get spending totals for the last 6 months.
 * Returns an array of { month, year, totalPence, label } for chart display.
 */
export const getMonthlySpendingHistory = query({
  args: {
    householdId: v.id("households"),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Validate user is a member of the household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", args.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this household");
    }

    // Get all sessions for the household
    const allSessions = await ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    // Generate last 6 months
    const currentMonth = getUkYearMonth(Date.now());
    const months: {
      month: number;
      year: number;
      startDate: number;
      endExclusive: number;
      label: string;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const normalized = new Date(
        Date.UTC(currentMonth.year, currentMonth.month - i, 1),
      );
      const year = normalized.getUTCFullYear();
      const month = normalized.getUTCMonth();
      const { start: startDate, endExclusive } = getUkMonthRange(year, month);
      const label = formatMonthShort(Date.UTC(year, month, 15));

      months.push({ month, year, startDate, endExclusive, label });
    }

    // Calculate totals for each month
    const monthlyData = months.map(({ month, year, startDate, endExclusive, label }) => {
      const monthSessions = allSessions.filter(
        (session) =>
          session.sessionDate >= startDate &&
          session.sessionDate < endExclusive,
      );

      const totalPence = monthSessions.reduce(
        (sum, session) => sum + (session.totalAmount ?? 0),
        0
      );

      return {
        month,
        year,
        label,
        totalPence,
        totalPounds: totalPence / 100,
        sessionCount: monthSessions.length,
      };
    });

    return monthlyData;
  },
});

/**
 * Get a single session by ID.
 * Validates that the user has access via household membership.
 */
export const getById = query({
  args: {
    sessionId: v.id("shoppingSessions"),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Get the session
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Validate user is a member of the session's household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", session.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this session");
    }

    // Get shopper info
    const shopper = await ctx.db.get(session.shopperId);
    const { receiptImageId: _receiptImageId, ...publicSession } = session;

    return {
      ...publicSession,
      shopperName: shopper?.name ?? "Unknown",
      shopperImageUrl: shopper?.imageUrl,
    };
  },
});
