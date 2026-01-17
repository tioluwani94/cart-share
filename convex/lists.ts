import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all non-archived lists for a household with item counts.
 * Validates that the user is a member of the household.
 */
export const getByHousehold = query({
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

    // Get all non-archived lists for the household
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_household_and_archived", (q) =>
        q.eq("householdId", args.householdId).eq("isArchived", false)
      )
      .collect();

    // Get item counts for each list
    const listsWithCounts = await Promise.all(
      lists.map(async (list) => {
        const items = await ctx.db
          .query("items")
          .withIndex("by_list", (q) => q.eq("listId", list._id))
          .collect();

        const totalItems = items.length;
        const completedItems = items.filter((item) => item.isCompleted).length;

        return {
          ...list,
          totalItems,
          completedItems,
        };
      })
    );

    return listsWithCounts;
  },
});

/**
 * Get a single list by ID.
 * Validates that the user has access to the list via household membership.
 */
export const getById = query({
  args: {
    listId: v.id("lists"),
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

    // Get the list
    const list = await ctx.db.get(args.listId);
    if (!list) return null;

    // Validate user is a member of the list's household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", list.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this list");
    }

    return list;
  },
});

/**
 * Create a new list in a household.
 * Validates that the user is a member of the household.
 */
export const create = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    category: v.optional(v.string()),
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

    // Create the list
    const listId = await ctx.db.insert("lists", {
      householdId: args.householdId,
      name: args.name.trim(),
      category: args.category,
      isArchived: false,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return { listId };
  },
});

/**
 * Archive a list.
 * Validates that the user has access to the list via household membership.
 */
export const archive = mutation({
  args: {
    listId: v.id("lists"),
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

    // Get the list
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    // Validate user is a member of the list's household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", list.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this list");
    }

    // Archive the list
    await ctx.db.patch(args.listId, {
      isArchived: true,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Update a list (rename or change category).
 * Validates that the user has access to the list via household membership.
 */
export const update = mutation({
  args: {
    listId: v.id("lists"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
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

    // Get the list
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("List not found");

    // Validate user is a member of the list's household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", list.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this list");
    }

    // Build update object
    const updates: { name?: string; category?: string; updatedAt: number } = {
      updatedAt: now,
    };

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }

    if (args.category !== undefined) {
      updates.category = args.category;
    }

    // Update the list
    await ctx.db.patch(args.listId, updates);

    return { success: true };
  },
});
