import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const DELETION_BATCH_SIZE = 16;
const DELETION_PAGE_SIZE = DELETION_BATCH_SIZE + 1;
const DELETION_DIGEST_DOMAIN = "ourpantry:deleted-account:";

export type AccountDeletionResult =
  | { status: "scheduled" }
  | { status: "already_deleted" }
  | { status: "deleted_user" }
  | { status: "deleted_member" }
  | { status: "deleted_household" };

async function getClerkIdDigest(clerkId: string) {
  const bytes = new TextEncoder().encode(`${DELETION_DIGEST_DOMAIN}${clerkId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function getDeletingClerkId(clerkId: string) {
  return `deleting:${await getClerkIdDigest(clerkId)}`;
}

export async function hasAccountDeletionTombstone(
  ctx: MutationCtx,
  clerkId: string,
) {
  const clerkIdDigest = await getClerkIdDigest(clerkId);
  return Boolean(
    await ctx.db
      .query("accountDeletionTombstones")
      .withIndex("by_clerk_id_digest", (query) =>
        query.eq("clerkIdDigest", clerkIdDigest),
      )
      .unique(),
  );
}

async function recordAccountDeletionTombstone(
  ctx: MutationCtx,
  clerkId: string,
) {
  const clerkIdDigest = await getClerkIdDigest(clerkId);
  const existing = await ctx.db
    .query("accountDeletionTombstones")
    .withIndex("by_clerk_id_digest", (query) =>
      query.eq("clerkIdDigest", clerkIdDigest),
    )
    .unique();
  if (!existing) {
    await ctx.db.insert("accountDeletionTombstones", {
      clerkIdDigest,
      deletedAt: Date.now(),
    });
  }
}

async function scheduleContinuation(
  ctx: MutationCtx,
  deletingClerkId: string,
) {
  await ctx.scheduler.runAfter(0, internal.users.continueDeletion, {
    deletingClerkId,
  });
}

async function deleteUserOwnedRows(
  ctx: MutationCtx,
  table: "userPreferences" | "pushTokens" | "notificationReminders",
  userId: Id<"users">,
) {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_user", (query) => query.eq("userId", userId))
    .take(DELETION_PAGE_SIZE);
  for (const row of rows.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.delete(row._id);
  }
  return rows.length <= DELETION_BATCH_SIZE;
}

async function deletePersonalData(ctx: MutationCtx, userId: Id<"users">) {
  if (!(await deleteUserOwnedRows(ctx, "userPreferences", userId))) {
    return false;
  }
  if (!(await deleteUserOwnedRows(ctx, "pushTokens", userId))) {
    return false;
  }
  if (!(await deleteUserOwnedRows(ctx, "notificationReminders", userId))) {
    return false;
  }
  return true;
}

async function clearHouseholdAttribution(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const lists = await ctx.db
    .query("lists")
    .withIndex("by_created_by", (query) => query.eq("createdBy", userId))
    .take(DELETION_PAGE_SIZE);
  for (const list of lists.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.patch(list._id, { createdBy: undefined });
  }
  if (lists.length > DELETION_BATCH_SIZE) return false;

  const addedItems = await ctx.db
    .query("items")
    .withIndex("by_added_by", (query) => query.eq("addedBy", userId))
    .take(DELETION_PAGE_SIZE);
  for (const item of addedItems.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.patch(item._id, { addedBy: undefined });
  }
  if (addedItems.length > DELETION_BATCH_SIZE) return false;

  const completedItems = await ctx.db
    .query("items")
    .withIndex("by_completed_by", (query) => query.eq("completedBy", userId))
    .take(DELETION_PAGE_SIZE);
  for (const item of completedItems.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.patch(item._id, { completedBy: undefined });
  }
  if (completedItems.length > DELETION_BATCH_SIZE) return false;

  const receipts = await ctx.db
    .query("receiptUploads")
    .withIndex("by_uploaded_by", (query) => query.eq("uploadedBy", userId))
    .take(DELETION_PAGE_SIZE);
  for (const receipt of receipts.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.patch(receipt._id, { uploadedBy: undefined });
  }
  if (receipts.length > DELETION_BATCH_SIZE) return false;

  const products = await ctx.db
    .query("householdProducts")
    .withIndex("by_created_by", (query) => query.eq("createdBy", userId))
    .take(DELETION_PAGE_SIZE);
  for (const product of products.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.patch(product._id, { createdBy: undefined });
  }
  if (products.length > DELETION_BATCH_SIZE) return false;

  const shoppedSessions = await ctx.db
    .query("shoppingSessions")
    .withIndex("by_shopper", (query) => query.eq("shopperId", userId))
    .take(DELETION_PAGE_SIZE);
  for (const session of shoppedSessions.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.patch(session._id, { shopperId: undefined });
  }
  if (shoppedSessions.length > DELETION_BATCH_SIZE) return false;

  const paidSessions = await ctx.db
    .query("shoppingSessions")
    .withIndex("by_paid_by", (query) => query.eq("paidBy", userId))
    .take(DELETION_PAGE_SIZE);
  for (const session of paidSessions.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.patch(session._id, {
      paidBy: undefined,
      paidByFormerMember: true,
    });
  }
  return paidSessions.length <= DELETION_BATCH_SIZE;
}

function chooseNextOwner(
  memberships: Doc<"householdMembers">[],
): Doc<"householdMembers"> {
  return [...memberships].sort(
    (left, right) =>
      left.joinedAt - right.joinedAt ||
      String(left._id).localeCompare(String(right._id)),
  )[0];
}

async function deleteStorageIfPresent(
  ctx: MutationCtx,
  storageId: Id<"_storage"> | undefined,
) {
  if (!storageId) return;
  if (await ctx.storage.getMetadata(storageId)) {
    await ctx.storage.delete(storageId);
  }
}

async function deleteFinalHousehold(
  ctx: MutationCtx,
  household: Doc<"households">,
  membership: Doc<"householdMembers">,
  userId: Id<"users">,
) {
  const lists = await ctx.db
    .query("lists")
    .withIndex("by_household", (query) =>
      query.eq("householdId", household._id),
    )
    .take(2);
  const list = lists[0];
  if (list) {
    const items = await ctx.db
      .query("items")
      .withIndex("by_list", (query) => query.eq("listId", list._id))
      .take(DELETION_PAGE_SIZE);
    for (const item of items.slice(0, DELETION_BATCH_SIZE)) {
      await ctx.db.delete(item._id);
    }
    if (items.length > DELETION_BATCH_SIZE) return false;
    await ctx.db.delete(list._id);
    if (lists.length > 1) return false;
  }

  const receipts = await ctx.db
    .query("receiptUploads")
    .withIndex("by_household", (query) =>
      query.eq("householdId", household._id),
    )
    .take(DELETION_PAGE_SIZE);
  for (const receipt of receipts.slice(0, DELETION_BATCH_SIZE)) {
    await deleteStorageIfPresent(ctx, receipt.storageId);
    await ctx.db.delete(receipt._id);
  }
  if (receipts.length > DELETION_BATCH_SIZE) return false;

  const activeProducts = await ctx.db
    .query("householdProducts")
    .withIndex("by_household_and_status", (query) =>
      query.eq("householdId", household._id).eq("status", "active"),
    )
    .take(DELETION_PAGE_SIZE);
  for (const product of activeProducts.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.delete(product._id);
  }
  if (activeProducts.length > DELETION_BATCH_SIZE) return false;

  const pausedProducts = await ctx.db
    .query("householdProducts")
    .withIndex("by_household_and_status", (query) =>
      query.eq("householdId", household._id).eq("status", "paused"),
    )
    .take(DELETION_PAGE_SIZE);
  for (const product of pausedProducts.slice(0, DELETION_BATCH_SIZE)) {
    await ctx.db.delete(product._id);
  }
  if (pausedProducts.length > DELETION_BATCH_SIZE) return false;

  const sessions = await ctx.db
    .query("shoppingSessions")
    .withIndex("by_household", (query) =>
      query.eq("householdId", household._id),
    )
    .take(DELETION_PAGE_SIZE);
  for (const session of sessions.slice(0, DELETION_BATCH_SIZE)) {
    await deleteStorageIfPresent(ctx, session.receiptImageId);
    await ctx.db.delete(session._id);
  }
  if (sessions.length > DELETION_BATCH_SIZE) return false;

  if (!(await deletePersonalData(ctx, userId))) return false;

  await ctx.db.delete(membership._id);
  await ctx.db.delete(household._id);
  await ctx.db.delete(userId);
  return true;
}

async function deleteAccountProjectionForDeletingUser(
  ctx: MutationCtx,
  deletingClerkId: string,
  activeUser?: Doc<"users"> | null,
): Promise<AccountDeletionResult> {
  const user =
    activeUser ??
    (await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (query) =>
        query.eq("clerkId", deletingClerkId),
      )
      .unique());
  if (!user) {
    return { status: "already_deleted" };
  }
  if (activeUser) {
    await ctx.db.patch(activeUser._id, {
      clerkId: deletingClerkId,
      email: "",
      name: undefined,
      imageUrl: undefined,
      updatedAt: Date.now(),
    });
  }

  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_user", (query) => query.eq("userId", user._id))
    .first();
  if (!membership) {
    if (!(await deletePersonalData(ctx, user._id))) {
      await scheduleContinuation(ctx, deletingClerkId);
      return { status: "scheduled" };
    }
    await ctx.db.delete(user._id);
    return { status: "deleted_user" };
  }

  const household = await ctx.db.get(membership.householdId);
  if (!household) {
    if (!(await deletePersonalData(ctx, user._id))) {
      await scheduleContinuation(ctx, deletingClerkId);
      return { status: "scheduled" };
    }
    await ctx.db.delete(membership._id);
    await ctx.db.delete(user._id);
    return { status: "deleted_user" };
  }

  const memberships = await ctx.db
    .query("householdMembers")
    .withIndex("by_household", (query) =>
      query.eq("householdId", household._id),
    )
    .collect();
  const remainingMemberships = memberships.filter(
    (candidate) => candidate.userId !== user._id,
  );
  if (remainingMemberships.length === 0) {
    if (
      !(await deleteFinalHousehold(
        ctx,
        household,
        membership,
        user._id,
      ))
    ) {
      await scheduleContinuation(ctx, deletingClerkId);
      return { status: "scheduled" };
    }
    return { status: "deleted_household" };
  }

  if (household.ownerId === user._id || membership.role === "owner") {
    const nextOwner = chooseNextOwner(remainingMemberships);
    await ctx.db.patch(household._id, {
      ownerId: nextOwner.userId,
      updatedAt: Date.now(),
    });
    if (nextOwner.role !== "owner") {
      await ctx.db.patch(nextOwner._id, { role: "owner" });
    }
    await ctx.db.patch(membership._id, { role: "member" });
  }

  if (!(await clearHouseholdAttribution(ctx, user._id))) {
    await scheduleContinuation(ctx, deletingClerkId);
    return { status: "scheduled" };
  }
  if (!(await deletePersonalData(ctx, user._id))) {
    await scheduleContinuation(ctx, deletingClerkId);
    return { status: "scheduled" };
  }
  await ctx.db.delete(membership._id);
  await ctx.db.delete(user._id);
  return { status: "deleted_member" };
}

/** Remove the Convex projection of a Clerk account deletion. */
export async function deleteAccountProjection(
  ctx: MutationCtx,
  clerkId: string,
): Promise<AccountDeletionResult> {
  await recordAccountDeletionTombstone(ctx, clerkId);
  const activeUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (query) => query.eq("clerkId", clerkId))
    .unique();
  const deletingClerkId = await getDeletingClerkId(clerkId);
  return deleteAccountProjectionForDeletingUser(
    ctx,
    deletingClerkId,
    activeUser,
  );
}

/** Continue deletion without persisting the raw provider identifier. */
export async function continueAccountDeletionProjection(
  ctx: MutationCtx,
  deletingClerkId: string,
): Promise<AccountDeletionResult> {
  return deleteAccountProjectionForDeletingUser(ctx, deletingClerkId);
}
