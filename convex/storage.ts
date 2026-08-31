import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";

async function getUserByClerkId(ctx: QueryCtx, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
  if (!user) throw new Error("User not found in database");
  return user;
}

async function requireCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return getUserByClerkId(ctx, identity.subject);
}

async function requireHouseholdMembership(
  ctx: QueryCtx,
  householdId: Id<"households">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_and_user", (q) =>
      q.eq("householdId", householdId).eq("userId", userId),
    )
    .unique();
  if (!membership) throw new Error("You are not a member of this household");
  return membership;
}

async function requireReceiptAccessForUser(
  ctx: QueryCtx,
  receiptUploadId: Id<"receiptUploads">,
  user: Doc<"users">,
) {
  const receiptUpload = await ctx.db.get(receiptUploadId);
  if (!receiptUpload) throw new Error("Receipt not found");

  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_and_user", (q) =>
      q
        .eq("householdId", receiptUpload.householdId)
        .eq("userId", user._id),
    )
    .unique();
  if (!membership) throw new Error("You do not have access to this receipt");

  return receiptUpload;
}

/**
 * Generate an upload URL for receipt images.
 * The client uploads directly to Convex storage using this URL.
 */
export const generateUploadUrl = mutation({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => {
    const user = await requireCurrentUser(ctx);
    await requireHouseholdMembership(ctx, householdId, user._id);

    const receiptUploadId = await ctx.db.insert("receiptUploads", {
      householdId,
      uploadedBy: user._id,
      createdAt: Date.now(),
    });
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { receiptUploadId, uploadUrl };
  },
});

/** Attach the resulting storage object to its pre-authorized upload record. */
export const completeUpload = mutation({
  args: {
    receiptUploadId: v.id("receiptUploads"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { receiptUploadId, storageId }) => {
    const user = await requireCurrentUser(ctx);
    const receiptUpload = await requireReceiptAccessForUser(
      ctx,
      receiptUploadId,
      user,
    );
    if (receiptUpload.uploadedBy !== user._id) {
      throw new Error("Only the uploader can complete this receipt upload");
    }
    if (receiptUpload.storageId) {
      throw new Error("Receipt upload is already complete");
    }

    await ctx.db.patch(receiptUploadId, { storageId });
    return { receiptUploadId };
  },
});

/**
 * Get a URL to view/download a stored file.
 */
export const getUrl = query({
  args: { receiptUploadId: v.id("receiptUploads") },
  handler: async (ctx, { receiptUploadId }) => {
    const user = await requireCurrentUser(ctx);
    const receiptUpload = await requireReceiptAccessForUser(
      ctx,
      receiptUploadId,
      user,
    );
    if (!receiptUpload.storageId) return null;
    return await ctx.storage.getUrl(receiptUpload.storageId);
  },
});

/**
 * Delete a stored file.
 */
export const deleteFile = mutation({
  args: { receiptUploadId: v.id("receiptUploads") },
  handler: async (ctx, { receiptUploadId }) => {
    const user = await requireCurrentUser(ctx);
    const receiptUpload = await requireReceiptAccessForUser(
      ctx,
      receiptUploadId,
      user,
    );
    if (receiptUpload.storageId) {
      await ctx.storage.delete(receiptUpload.storageId);
    }
    await ctx.db.delete(receiptUploadId);
  },
});

/** Internal authorization lookup used by the OCR action. */
export const getAuthorizedUploadForProcessing = internalQuery({
  args: {
    receiptUploadId: v.id("receiptUploads"),
    clerkId: v.string(),
  },
  handler: async (ctx, { receiptUploadId, clerkId }) => {
    const user = await getUserByClerkId(ctx, clerkId);
    return requireReceiptAccessForUser(ctx, receiptUploadId, user);
  },
});
