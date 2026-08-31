import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * Ensure an authenticated Clerk user has a matching Convex user record.
 * This repairs webhook delivery gaps and allows development data resets to
 * recover without trusting identity fields supplied by the client.
 */
export const ensureCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    if (!identity.email) {
      throw new Error("Authenticated user email is unavailable");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    const now = Date.now();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: identity.email,
        ...(identity.name ? { name: identity.name } : {}),
        ...(identity.pictureUrl ? { imageUrl: identity.pictureUrl } : {}),
        updatedAt: now,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email,
      name: identity.name,
      imageUrl: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Create or update a user from Clerk webhook events.
 * This is an internal mutation called by the HTTP webhook handler.
 */
export const createOrUpdate = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists by clerkId
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        createdAt: now,
        updatedAt: now,
      });
      return userId;
    }
  },
});

/**
 * Get a user by their Clerk ID.
 * Used internally for looking up users after auth.
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Get the current authenticated user.
 * Returns null if not authenticated or user not found in database.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Clerk provides the subject as the user ID
    const clerkId = identity.subject;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});
