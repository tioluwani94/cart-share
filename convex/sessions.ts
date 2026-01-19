import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new shopping session.
 * Records a completed shopping trip with receipt information.
 * totalAmount is stored in cents (integer) for precision.
 */
export const create = mutation({
  args: {
    householdId: v.id("households"),
    totalAmount: v.number(), // in cents (integer)
    storeName: v.optional(v.string()),
    listId: v.optional(v.id("lists")),
    receiptImageId: v.optional(v.id("_storage")),
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

    // Create the shopping session
    const sessionId = await ctx.db.insert("shoppingSessions", {
      householdId: args.householdId,
      listId: args.listId,
      totalAmount: Math.round(args.totalAmount), // ensure integer cents
      storeName: args.storeName?.trim(),
      shopperId: user._id,
      receiptImageId: args.receiptImageId,
      sessionDate: args.sessionDate ?? now,
      createdAt: now,
    });

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
    let sessionsQuery = ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .order("desc");

    const sessions = args.limit
      ? await sessionsQuery.take(args.limit)
      : await sessionsQuery.collect();

    // Enrich sessions with shopper info
    const sessionsWithShopperInfo = await Promise.all(
      sessions.map(async (session) => {
        const shopper = await ctx.db.get(session.shopperId);
        return {
          ...session,
          shopperName: shopper?.name ?? "Unknown",
          shopperImageUrl: shopper?.imageUrl,
        };
      })
    );

    // Sort by sessionDate descending (since index order may not match)
    return sessionsWithShopperInfo.sort((a, b) => b.sessionDate - a.sessionDate);
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
        const shopper = await ctx.db.get(session.shopperId);
        return {
          ...session,
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
 * Returns the sum of all session amounts in cents.
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

    // Calculate start and end of the month
    const startDate = new Date(args.year, args.month, 1).getTime();
    const endDate = new Date(args.year, args.month + 1, 0, 23, 59, 59, 999).getTime();

    // Get all sessions for the household in the date range
    const allSessions = await ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    // Filter by date range and sum amounts
    const totalCents = allSessions
      .filter(
        (session) =>
          session.sessionDate >= startDate && session.sessionDate <= endDate
      )
      .reduce((sum, session) => sum + session.totalAmount, 0);

    return {
      totalCents,
      totalDollars: totalCents / 100,
      sessionCount: allSessions.filter(
        (session) =>
          session.sessionDate >= startDate && session.sessionDate <= endDate
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

    // Calculate start and end of the current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    // Get all sessions for the household
    const allSessions = await ctx.db
      .query("shoppingSessions")
      .withIndex("by_household", (q) => q.eq("householdId", args.householdId))
      .collect();

    // Count sessions in current month
    const count = allSessions.filter(
      (session) =>
        session.sessionDate >= startDate && session.sessionDate <= endDate
    ).length;

    return { count };
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

    return {
      ...session,
      shopperName: shopper?.name ?? "Unknown",
      shopperImageUrl: shopper?.imageUrl,
    };
  },
});
