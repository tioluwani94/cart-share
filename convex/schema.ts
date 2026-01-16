import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Households table - a household contains up to 2 members (couple)
  households: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_invite_code", ["inviteCode"]),

  // Household members - links users to households
  householdMembers: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_user", ["userId"])
    .index("by_household_and_user", ["householdId", "userId"]),

  // Lists table - shopping lists belonging to a household
  lists: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    category: v.optional(v.string()),
    isArchived: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_archived", ["householdId", "isArchived"])
    .index("by_created_by", ["createdBy"]),

  // Items table - items within a shopping list
  items: defineTable({
    listId: v.id("lists"),
    name: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    isCompleted: v.boolean(),
    addedBy: v.id("users"),
    completedBy: v.optional(v.id("users")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_and_completed", ["listId", "isCompleted"])
    .index("by_added_by", ["addedBy"]),

  // Shopping sessions - tracks completed shopping trips with receipts
  shoppingSessions: defineTable({
    householdId: v.id("households"),
    listId: v.optional(v.id("lists")),
    totalAmount: v.number(), // stored in cents (integer)
    storeName: v.optional(v.string()),
    shopperId: v.id("users"),
    receiptImageId: v.optional(v.id("_storage")),
    sessionDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_date", ["householdId", "sessionDate"])
    .index("by_shopper", ["shopperId"])
    .index("by_list", ["listId"]),
});
