import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all items for a list.
 * Validates that the user has access via household membership.
 */
export const getByList = query({
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

    // Get the list to check household membership
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

    // Get all items for the list
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    return items;
  },
});

/**
 * Add a new item to a list.
 * Validates that the user has access via household membership.
 * Records the addedBy user.
 */
export const add = mutation({
  args: {
    listId: v.id("lists"),
    name: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
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

    // Get the list to check household membership
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

    // Create the item
    const itemId = await ctx.db.insert("items", {
      listId: args.listId,
      name: args.name.trim(),
      quantity: args.quantity,
      unit: args.unit,
      notes: args.notes,
      category: args.category,
      isCompleted: false,
      addedBy: user._id,
      completedBy: undefined,
      completedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { itemId };
  },
});

/**
 * Toggle an item's completion status.
 * Updates isCompleted, completedBy, and completedAt.
 * Validates that the user has access via household membership.
 */
export const toggleComplete = mutation({
  args: {
    itemId: v.id("items"),
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

    // Get the item
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    // Get the list to check household membership
    const list = await ctx.db.get(item.listId);
    if (!list) throw new Error("List not found");

    // Validate user is a member of the list's household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", list.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this item");
    }

    // Toggle completion status
    const isNowCompleted = !item.isCompleted;

    await ctx.db.patch(args.itemId, {
      isCompleted: isNowCompleted,
      completedBy: isNowCompleted ? user._id : undefined,
      completedAt: isNowCompleted ? now : undefined,
      updatedAt: now,
    });

    return { success: true, isCompleted: isNowCompleted };
  },
});

/**
 * Update an item's details.
 * Allows editing name, quantity, unit, notes, and category.
 * Validates that the user has access via household membership.
 */
export const update = mutation({
  args: {
    itemId: v.id("items"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
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

    // Get the item
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    // Get the list to check household membership
    const list = await ctx.db.get(item.listId);
    if (!list) throw new Error("List not found");

    // Validate user is a member of the list's household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", list.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this item");
    }

    // Build update object
    const updates: {
      name?: string;
      quantity?: number;
      unit?: string;
      notes?: string;
      category?: string;
      updatedAt: number;
    } = {
      updatedAt: now,
    };

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }

    if (args.quantity !== undefined) {
      updates.quantity = args.quantity;
    }

    if (args.unit !== undefined) {
      updates.unit = args.unit;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    if (args.category !== undefined) {
      updates.category = args.category;
    }

    // Update the item
    await ctx.db.patch(args.itemId, updates);

    return { success: true };
  },
});

/**
 * Remove an item from a list.
 * Validates that the user has access via household membership.
 */
export const remove = mutation({
  args: {
    itemId: v.id("items"),
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

    // Get the item
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    // Get the list to check household membership
    const list = await ctx.db.get(item.listId);
    if (!list) throw new Error("List not found");

    // Validate user is a member of the list's household
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_household_and_user", (q) =>
        q.eq("householdId", list.householdId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this item");
    }

    // Delete the item
    await ctx.db.delete(args.itemId);

    return { success: true };
  },
});
