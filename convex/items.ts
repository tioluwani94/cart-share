import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";

type ItemReference = {
  itemId?: Id<"items">;
  listId?: Id<"lists">;
  clientId?: string;
};

async function resolveItem(ctx: MutationCtx, reference: ItemReference) {
  if (reference.itemId) return ctx.db.get(reference.itemId);
  if (reference.listId && reference.clientId) {
    return ctx.db
      .query("items")
      .withIndex("by_list_and_client_id", (q) =>
        q
          .eq("listId", reference.listId as Id<"lists">)
          .eq("clientId", reference.clientId),
      )
      .unique();
  }
  throw new Error("An item ID or stable client item reference is required");
}

async function requireItemAccess(
  ctx: MutationCtx,
  item: Doc<"items">,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found in database");

  const list = await ctx.db.get(item.listId);
  if (!list) throw new Error("List not found");

  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_and_user", (q) =>
      q.eq("householdId", list.householdId).eq("userId", user._id),
    )
    .unique();
  if (!membership) throw new Error("You do not have access to this item");

  return user;
}

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

    // Enrich items with addedBy user info
    const itemsWithUser = await Promise.all(
      items.map(async (item) => {
        let addedByUser = null;
        if (item.addedBy) {
          const user = await ctx.db.get(item.addedBy);
          if (user) {
            addedByUser = {
              _id: user._id,
              name: user.name,
              imageUrl: user.imageUrl,
            };
          }
        }
        return {
          ...item,
          addedByUser,
        };
      })
    );

    return itemsWithUser;
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
    clientId: v.optional(v.string()),
    name: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedPricePence: v.optional(v.number()),
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

    // Offline adds are idempotent. A retry with the same stable client ID
    // resolves to the item created by the first successful replay.
    if (args.clientId) {
      const existingItem = await ctx.db
        .query("items")
        .withIndex("by_list_and_client_id", (q) =>
          q.eq("listId", args.listId).eq("clientId", args.clientId),
        )
        .unique();
      if (existingItem) return { itemId: existingItem._id };
    }

    // Create the item
    const itemId = await ctx.db.insert("items", {
      listId: args.listId,
      clientId: args.clientId,
      name: args.name.trim(),
      quantity: args.quantity,
      unit: args.unit,
      notes: args.notes,
      category: args.category,
      estimatedPricePence:
        args.estimatedPricePence === undefined
          ? undefined
          : Math.max(0, Math.round(args.estimatedPricePence)),
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
 * Set an item's completion state to the caller's intended value.
 * Offline queues use this instead of a toggle so replay is deterministic.
 * Conflicts use server-arrival order: the last mutation applied by Convex wins.
 */
export const setCompleted = mutation({
  args: {
    itemId: v.optional(v.id("items")),
    listId: v.optional(v.id("lists")),
    clientId: v.optional(v.string()),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const item = await resolveItem(ctx, args);
    if (!item) throw new Error("Item not found");
    const user = await requireItemAccess(ctx, item);
    const now = Date.now();

    await ctx.db.patch(item._id, {
      isCompleted: args.isCompleted,
      completedBy: args.isCompleted ? user._id : undefined,
      completedAt: args.isCompleted ? now : undefined,
      updatedAt: now,
    });

    return { success: true as const, isCompleted: args.isCompleted };
  },
});

/**
 * Update an item's details.
 * Allows editing name, quantity, unit, notes, and category.
 * Validates that the user has access via household membership.
 */
export const update = mutation({
  args: {
    itemId: v.optional(v.id("items")),
    listId: v.optional(v.id("lists")),
    clientId: v.optional(v.string()),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedPricePence: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const item = await resolveItem(ctx, args);
    if (!item) throw new Error("Item not found");
    await requireItemAccess(ctx, item);
    const now = Date.now();

    // Build update object
    const updates: {
      name?: string;
      quantity?: number;
      unit?: string;
      notes?: string;
      category?: string;
      estimatedPricePence?: number;
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

    if (args.estimatedPricePence !== undefined) {
      updates.estimatedPricePence =
        args.estimatedPricePence === null
          ? undefined
          : Math.max(0, Math.round(args.estimatedPricePence));
    }

    // Update the item
    // Patches only the supplied fields. For overlapping fields, the last
    // mutation applied by Convex wins; client timestamps are not consulted.
    await ctx.db.patch(item._id, updates);

    return { success: true };
  },
});

/**
 * Remove an item from a list.
 * Validates that the user has access via household membership.
 */
export const remove = mutation({
  args: {
    itemId: v.optional(v.id("items")),
    listId: v.optional(v.id("lists")),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await resolveItem(ctx, args);
    if (!item) throw new Error("Item not found");
    await requireItemAccess(ctx, item);

    // Delete the item
    await ctx.db.delete(item._id);

    return { success: true };
  },
});
