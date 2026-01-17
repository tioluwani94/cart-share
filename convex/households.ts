import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Generate a unique 6-character alphanumeric invite code.
 * Uses uppercase letters and numbers for easy sharing.
 */
function generateInviteCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded I, O, 0, 1 for clarity
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

/**
 * Create a new household.
 * The authenticated user becomes the owner and first member.
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;
    const now = Date.now();

    // Get the current user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error("User not found in database");

    // Check if user already belongs to a household
    const existingMembership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingMembership) {
      throw new Error("You already belong to a household");
    }

    // Generate a unique invite code
    let inviteCode = generateInviteCode();
    let existingHousehold = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
      .unique();

    // Regenerate if code already exists (very unlikely but possible)
    while (existingHousehold) {
      inviteCode = generateInviteCode();
      existingHousehold = await ctx.db
        .query("households")
        .withIndex("by_invite_code", (q) => q.eq("inviteCode", inviteCode))
        .unique();
    }

    // Create the household
    const householdId = await ctx.db.insert("households", {
      name: args.name,
      inviteCode,
      ownerId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // Add the creator as an owner member
    await ctx.db.insert("householdMembers", {
      householdId,
      userId: user._id,
      role: "owner",
      joinedAt: now,
    });

    return { householdId, inviteCode };
  },
});

/**
 * Get the current user's household.
 * Returns null if user doesn't belong to a household.
 */
export const getCurrentHousehold = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkId = identity.subject;

    // Get the current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) return null;

    // Find user's household membership
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership) return null;

    // Get the household details
    const household = await ctx.db.get(membership.householdId);
    if (!household) return null;

    // Get all members of the household
    const memberships = await ctx.db
      .query("householdMembers")
      .withIndex("by_household", (q) => q.eq("householdId", household._id))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const memberUser = await ctx.db.get(m.userId);
        return {
          ...m,
          user: memberUser,
        };
      })
    );

    return {
      ...household,
      members,
      userRole: membership.role,
    };
  },
});

/**
 * Get a household by invite code.
 * Used when joining a household.
 */
export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();
  },
});
