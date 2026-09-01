import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  continueAccountDeletionProjection,
  deleteAccountProjection,
  hasAccountDeletionTombstone,
  type AccountDeletionResult,
} from "./accountDeletion";

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

    if (await hasAccountDeletionTombstone(ctx, identity.subject)) {
      return null;
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
 * Refresh an existing user from Clerk webhook events.
 *
 * Authenticated `ensureCurrent` is the only path that creates users. Ignoring
 * an upsert for a missing row prevents delayed events from recreating an
 * account after a newer `user.deleted` webhook has removed it.
 */
export const syncExistingFromClerk = internalMutation({
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

    if (!existingUser) return null;

    await ctx.db.patch(existingUser._id, {
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      updatedAt: now,
    });
    return existingUser._id;
  },
});

/**
 * Remove a Clerk user's Convex projection after a signed user.deleted webhook.
 * Missing users are successful no-ops because Clerk retries failed webhooks.
 */
export const deleteByClerkId = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }): Promise<AccountDeletionResult> =>
    deleteAccountProjection(ctx, clerkId),
});

/** Continue an account deletion that exceeded one bounded mutation batch. */
export const continueDeletion = internalMutation({
  args: { deletingClerkId: v.string() },
  handler: async (
    ctx,
    { deletingClerkId },
  ): Promise<AccountDeletionResult> =>
    continueAccountDeletionProjection(ctx, deletingClerkId),
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
