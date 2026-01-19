import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate an upload URL for receipt images.
 * The client uploads directly to Convex storage using this URL.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Generate and return the upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a URL to view/download a stored file.
 */
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.getUrl(storageId);
  },
});

/**
 * Delete a stored file.
 */
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.storage.delete(storageId);
  },
});
