import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    // A name chosen in Settings takes precedence over identity-provider updates.
    hasCustomName: v.optional(v.boolean()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Opaque deletion markers prevent short-lived stale Clerk JWTs from
  // recreating a user after account deletion has completed.
  accountDeletionTombstones: defineTable({
    clerkIdDigest: v.string(),
    deletedAt: v.number(),
  }).index("by_clerk_id_digest", ["clerkIdDigest"]),

  // Households table - a household contains up to 2 members (couple)
  households: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    ownerId: v.id("users"),
    monthlyBudgetPence: v.optional(v.number()),
    activeListId: v.optional(v.id("lists")),
    shoppingCadenceDays: v.optional(v.number()),
    peopleServed: v.optional(v.number()),
    preferredShoppingMode: v.optional(
      v.union(v.literal("in_store"), v.literal("online"), v.literal("both")),
    ),
    marketCountryCode: v.optional(v.string()),
    currencyCode: v.optional(v.string()),
    locale: v.optional(v.string()),
    planningTimeZone: v.optional(v.string()),
    restockSetupCompletedAt: v.optional(v.number()),
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
    tripBudgetPence: v.optional(v.number()),
    plannedFor: v.optional(v.number()),
    shoppingMode: v.optional(
      v.union(v.literal("in_store"), v.literal("online")),
    ),
    isArchived: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_archived", ["householdId", "isArchived"])
    .index("by_created_by", ["createdBy"]),

  // Items table - items within a shopping list
  items: defineTable({
    listId: v.id("lists"),
    clientId: v.optional(v.string()),
    name: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    estimatedPricePence: v.optional(v.number()),
    householdProductId: v.optional(v.id("householdProducts")),
    isCompleted: v.boolean(),
    addedBy: v.optional(v.id("users")),
    completedBy: v.optional(v.id("users")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_and_client_id", ["listId", "clientId"])
    .index("by_list_and_completed", ["listId", "isCompleted"])
    .index("by_added_by", ["addedBy"])
    .index("by_completed_by", ["completedBy"]),

  // Receipt uploads - binds private storage objects to a household.
  // storageId is filled after the client completes the direct upload.
  receiptUploads: defineTable({
    householdId: v.id("households"),
    uploadedBy: v.optional(v.id("users")),
    storageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_uploaded_by", ["uploadedBy"])
    .index("by_household", ["householdId"]),

  // Replenishment memory. This models shopping rhythm, not exact stock.
  householdProducts: defineTable({
    householdId: v.id("households"),
    displayName: v.string(),
    normalizedName: v.string(),
    category: v.optional(v.string()),
    defaultQuantity: v.optional(v.number()),
    defaultUnit: v.optional(v.string()),
    cadenceDays: v.number(),
    lastPurchasedAt: v.optional(v.number()),
    reviewAfter: v.optional(v.number()),
    purchaseObservationCount: v.number(),
    status: v.union(
      v.literal("learning"),
      v.literal("active"),
      v.literal("paused"),
    ),
    recentOperationIds: v.optional(v.array(v.string())),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household_and_status", ["householdId", "status"])
    .index("by_created_by", ["createdBy"])
    .index("by_household_and_normalized_name", [
      "householdId",
      "normalizedName",
    ]),

  // Server-owned, five-minute receipts for conflict-safe restock Undo.
  restockUndoRecords: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    productId: v.id("householdProducts"),
    operationId: v.string(),
    listId: v.optional(v.id("lists")),
    createdItemId: v.optional(v.id("items")),
    expectedItem: v.optional(v.string()),
    expectedProduct: v.string(),
    previousCadenceDays: v.number(),
    previousReviewAfter: v.optional(v.number()),
    expiresAt: v.number(),
    undoneAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_household", ["householdId"])
    .index("by_product_and_operation", ["productId", "operationId"]),

  // One product contributes at most one piece of evidence per completed shop.
  productPurchaseObservations: defineTable({
    householdId: v.id("households"),
    householdProductId: v.id("householdProducts"),
    shoppingSessionId: v.id("shoppingSessions"),
    sourceItemId: v.optional(v.id("items")),
    purchasedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_product_and_session", [
      "householdProductId",
      "shoppingSessionId",
    ])
    .index("by_household_and_date", ["householdId", "purchasedAt"]),

  // Consent and reminder choices belong to a person, not the household.
  userPreferences: defineTable({
    userId: v.id("users"),
    analyticsConsent: v.optional(
      v.union(v.literal("granted"), v.literal("denied")),
    ),
    analyticsConsentUpdatedAt: v.optional(v.number()),
    restockNotificationsEnabled: v.boolean(),
    notificationTimeMinutesLocal: v.number(),
    notificationTimeZone: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Expo push tokens are explicitly bound to the authenticated user.
  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    deviceId: v.optional(v.string()),
    lastSeenAt: v.number(),
    disabledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  notificationReminders: defineTable({
    userId: v.id("users"),
    householdId: v.id("households"),
    kind: v.union(
      v.literal("restock_review"),
      v.literal("shop_reminder"),
      v.literal("product_learning"),
    ),
    productIds: v.optional(v.array(v.id("householdProducts"))),
    scheduledFor: v.number(),
    dedupeKey: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("cancelled"),
      v.literal("failed"),
    ),
    expoTicketId: v.optional(v.string()),
    attemptCount: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_scheduled_for", ["status", "scheduledFor"])
    .index("by_dedupe_key", ["dedupeKey"])
    .index("by_user", ["userId"]),

  // Shopping sessions - tracks completed shopping trips with receipts
  shoppingSessions: defineTable({
    householdId: v.id("households"),
    listId: v.optional(v.id("lists")),
    totalAmount: v.optional(v.number()), // stored in pence (integer)
    storeName: v.optional(v.string()),
    shopperId: v.optional(v.id("users")),
    paidBy: v.optional(v.union(v.literal("joint"), v.id("users"))),
    paidByFormerMember: v.optional(v.boolean()),
    receiptImageId: v.optional(v.id("_storage")),
    completionOperationId: v.optional(v.string()),
    sessionDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_and_date", ["householdId", "sessionDate"])
    .index("by_shopper", ["shopperId"])
    .index("by_paid_by", ["paidBy"])
    .index("by_list", ["listId"])
    .index("by_list_and_completion_operation", [
      "listId",
      "completionOperationId",
    ]),
});
