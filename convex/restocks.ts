import { v } from "convex/values";
import {
  applyRestockDecision,
  calculateRestockReview,
  DAY_MS,
  learnFromPurchase,
} from "../lib/restockEngine";
import { calculatePlannedTotal } from "../lib/budget";
import { shouldRejectNextShopClaim } from "../lib/shoppingList";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

async function requireCurrentUser(ctx: ReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (query) =>
      query.eq("clerkId", identity.subject),
    )
    .unique();
  if (!user) throw new Error("User not found in database");
  return user;
}

async function requireMembership(
  ctx: ReadCtx,
  householdId: Id<"households">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("householdMembers")
    .withIndex("by_household_and_user", (query) =>
      query.eq("householdId", householdId).eq("userId", userId),
    )
    .unique();
  if (!membership) {
    throw new Error("You do not have access to this household product");
  }
  return membership;
}

function normalizeProductName(value: string): string {
  return value.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
}

function clampCadenceDays(value: number): number {
  return Math.min(180, Math.max(1, Math.round(value)));
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export async function recordCompletedShop(
  ctx: MutationCtx,
  args: {
    sessionId: Id<"shoppingSessions">;
  },
) {
  const session = await ctx.db.get(args.sessionId);
  if (!session) throw new Error("Shopping session not found");
  if (!session.listId) return;
  const list = await ctx.db.get(session.listId);
  if (!list || list.householdId !== session.householdId) {
    throw new Error("Shopping session list does not belong to its household");
  }
  const completedItems = await ctx.db
    .query("items")
    .withIndex("by_list_and_completed", (query) =>
      query.eq("listId", session.listId!).eq("isCompleted", true),
    )
    .collect();
  const updatedAt = Date.now();
  const learnedProductIds = new Set<string>();
  for (const item of completedItems) {
    if (
      !item.householdProductId ||
      learnedProductIds.has(item.householdProductId)
    ) {
      continue;
    }
    const product = await ctx.db.get(item.householdProductId);
    if (
      !product ||
      product.householdId !== session.householdId ||
      product.status !== "active"
    ) {
      continue;
    }
    const learning = learnFromPurchase({
      product: {
        id: product._id,
        displayName: product.displayName,
        status: product.status,
        cadenceDays: product.cadenceDays,
        lastPurchasedAt: product.lastPurchasedAt,
        activatedAt: product.createdAt,
        reviewAfter: product.reviewAfter,
        purchaseObservationCount: product.purchaseObservationCount,
      },
      purchasedAt: session.sessionDate,
    });
    await ctx.db.patch(product._id, {
      ...learning,
      updatedAt,
    });
    learnedProductIds.add(product._id);
  }
}

export const getReview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .first();
    if (!membership) throw new Error("You do not belong to a household");

    const household = await ctx.db.get(membership.householdId);
    if (!household) throw new Error("Household not found");
    const activeListRecord = household.activeListId
      ? await ctx.db.get(household.activeListId)
      : null;
    const activeList = activeListRecord?.isArchived ? null : activeListRecord;
    const [products, pausedProducts] = await Promise.all([
      ctx.db
        .query("householdProducts")
        .withIndex("by_household_and_status", (index) =>
          index.eq("householdId", household._id).eq("status", "active"),
        )
        .collect(),
      ctx.db
        .query("householdProducts")
        .withIndex("by_household_and_status", (index) =>
          index.eq("householdId", household._id).eq("status", "paused"),
        )
        .collect(),
    ]);
    const now = Date.now();
    const candidates = calculateRestockReview({
      now,
      nextShopAt: activeList?.plannedFor,
      shoppingCadenceDays: household.shoppingCadenceDays,
      products: products.map((product) => ({
        id: product._id,
        displayName: product.displayName,
        status: product.status,
        cadenceDays: product.cadenceDays,
        lastPurchasedAt: product.lastPurchasedAt,
        activatedAt: product.createdAt,
        reviewAfter: product.reviewAfter,
        purchaseObservationCount: product.purchaseObservationCount,
      })),
    });

    const activeItems = activeList
      ? await ctx.db
          .query("items")
          .withIndex("by_list", (index) => index.eq("listId", activeList._id))
          .collect()
      : [];
    const itemByProduct = new Map(
      activeItems
        .filter((item) => item.householdProductId)
        .map((item) => [item.householdProductId, item]),
    );

    return {
      setupCompleted: household.restockSetupCompletedAt !== undefined,
      household: {
        _id: household._id,
        peopleServed: household.peopleServed,
        shoppingCadenceDays: household.shoppingCadenceDays,
        preferredShoppingMode: household.preferredShoppingMode,
        marketCountryCode: household.marketCountryCode ?? "GB",
        currencyCode: household.currencyCode ?? "GBP",
        locale: household.locale ?? "en-GB",
        planningTimeZone: household.planningTimeZone ?? "Europe/London",
      },
      activeList: activeList
        ? {
            _id: activeList._id,
            name: activeList.name,
            plannedFor: activeList.plannedFor,
            shoppingMode: activeList.shoppingMode,
            tripBudgetPence: activeList.tripBudgetPence,
            totalItems: activeItems.length,
            completedItems: activeItems.filter((item) => item.isCompleted)
              .length,
            plannedTotalPence: calculatePlannedTotal(activeItems),
          }
        : null,
      candidates: candidates.map((candidate) => {
        const product = products.find(
          (entry) => entry._id === candidate.productId,
        )!;
        return {
          ...candidate,
          householdProductId: product._id,
          defaultQuantity: product.defaultQuantity,
          defaultUnit: product.defaultUnit,
          lastPurchasedAt: product.lastPurchasedAt,
          isAdded: itemByProduct.has(product._id),
        };
      }),
      trackedProductCount: products.length + pausedProducts.length,
      candidateCount: candidates.length,
    };
  },
});

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .first();
    if (!membership) throw new Error("You do not belong to a household");

    const [activeProducts, pausedProducts] = await Promise.all([
      ctx.db
        .query("householdProducts")
        .withIndex("by_household_and_status", (index) =>
          index
            .eq("householdId", membership.householdId)
            .eq("status", "active"),
        )
        .collect(),
      ctx.db
        .query("householdProducts")
        .withIndex("by_household_and_status", (index) =>
          index
            .eq("householdId", membership.householdId)
            .eq("status", "paused"),
        )
        .collect(),
    ]);

    return [...activeProducts, ...pausedProducts]
      .sort(
        (left, right) =>
          Number(left.status === "paused") - Number(right.status === "paused") ||
          left.displayName.localeCompare(right.displayName, "en-GB"),
      )
      .map((product) => ({
        _id: product._id,
        displayName: product.displayName,
        category: product.category,
        defaultQuantity: product.defaultQuantity,
        defaultUnit: product.defaultUnit,
        cadenceDays: product.cadenceDays,
        lastPurchasedAt: product.lastPurchasedAt,
        purchaseObservationCount: product.purchaseObservationCount,
        status: product.status,
      }));
  },
});

export const getActivationSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .first();
    if (!membership) throw new Error("You do not belong to a household");

    const lists = await ctx.db
      .query("lists")
      .withIndex("by_household", (index) =>
        index.eq("householdId", membership.householdId),
      )
      .collect();
    const items = (
      await Promise.all(
        lists.map((list) =>
          ctx.db
            .query("items")
            .withIndex("by_list", (index) => index.eq("listId", list._id))
            .collect(),
        ),
      )
    ).flat();

    const grouped = new Map<
      string,
      {
        displayName: string;
        category?: string;
        quantity?: number;
        unit?: string;
        purchaseDates: number[];
        occurrences: number;
      }
    >();
    for (const item of items) {
      const normalizedName = normalizeProductName(item.name);
      if (!normalizedName) continue;
      const entry = grouped.get(normalizedName) ?? {
        displayName: item.name.trim(),
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        purchaseDates: [],
        occurrences: 0,
      };
      entry.occurrences += 1;
      if (item.isCompleted && item.completedAt) {
        entry.purchaseDates.push(item.completedAt);
      }
      grouped.set(normalizedName, entry);
    }

    return [...grouped.entries()]
      .filter(([, entry]) => entry.occurrences >= 2)
      .map(([normalizedName, entry]) => {
        const dates = entry.purchaseDates.sort((left, right) => left - right);
        const intervals = dates.slice(1).map(
          (date, index) => (date - dates[index]) / DAY_MS,
        );
        return {
          normalizedName,
          displayName: entry.displayName,
          category: entry.category,
          defaultQuantity: entry.quantity,
          defaultUnit: entry.unit,
          cadenceDays: clampCadenceDays(median(intervals) ?? 7),
          lastPurchasedAt: dates.at(-1),
          purchaseObservationCount: dates.length,
          occurrences: entry.occurrences,
        };
      })
      .sort(
        (left, right) =>
          right.occurrences - left.occurrences ||
          left.displayName.localeCompare(right.displayName, "en-GB"),
      )
      .slice(0, 12);
  },
});

export const completeSetup = mutation({
  args: {
    activeListId: v.id("lists"),
    peopleServed: v.number(),
    shoppingCadenceDays: v.optional(v.number()),
    preferredShoppingMode: v.union(
      v.literal("in_store"),
      v.literal("online"),
      v.literal("both"),
    ),
    planningTimeZone: v.string(),
    products: v.array(
      v.object({
        displayName: v.string(),
        category: v.optional(v.string()),
        defaultQuantity: v.optional(v.number()),
        defaultUnit: v.optional(v.string()),
        cadenceDays: v.number(),
        lastPurchasedAt: v.optional(v.number()),
        purchaseObservationCount: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const membership = await ctx.db
      .query("householdMembers")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .first();
    if (!membership) throw new Error("You do not belong to a household");
    const list = await ctx.db.get(args.activeListId);
    if (
      !list ||
      list.householdId !== membership.householdId ||
      list.isArchived
    ) {
      throw new Error("Choose an active list from your household");
    }
    const peopleServed = Math.round(args.peopleServed);
    if (peopleServed < 1 || peopleServed > 20) {
      throw new Error("People served must be between 1 and 20");
    }
    if (!args.planningTimeZone.trim()) {
      throw new Error("Planning time zone is required");
    }

    const now = Date.now();
    for (const product of args.products) {
      const displayName = product.displayName.trim();
      const normalizedName = normalizeProductName(displayName);
      if (!normalizedName) continue;
      const existing = await ctx.db
        .query("householdProducts")
        .withIndex("by_household_and_normalized_name", (index) =>
          index
            .eq("householdId", membership.householdId)
            .eq("normalizedName", normalizedName),
        )
        .unique();
      const changes = {
        displayName,
        category: product.category,
        defaultQuantity: product.defaultQuantity,
        defaultUnit: product.defaultUnit,
        cadenceDays: clampCadenceDays(product.cadenceDays),
        lastPurchasedAt: product.lastPurchasedAt,
        purchaseObservationCount: Math.max(
          0,
          Math.round(product.purchaseObservationCount),
        ),
        status: "active" as const,
        updatedAt: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, changes);
      } else {
        await ctx.db.insert("householdProducts", {
          householdId: membership.householdId,
          normalizedName,
          ...changes,
          createdBy: user._id,
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(membership.householdId, {
      activeListId: args.activeListId,
      peopleServed,
      shoppingCadenceDays:
        args.shoppingCadenceDays === undefined
          ? undefined
          : clampCadenceDays(args.shoppingCadenceDays),
      preferredShoppingMode: args.preferredShoppingMode,
      marketCountryCode: "GB",
      currencyCode: "GBP",
      locale: "en-GB",
      planningTimeZone: args.planningTimeZone,
      restockSetupCompletedAt: now,
      updatedAt: now,
    });

    return { success: true as const };
  },
});

export const setNextShop = mutation({
  args: {
    listId: v.id("lists"),
    plannedFor: v.optional(v.number()),
    shoppingMode: v.optional(
      v.union(v.literal("in_store"), v.literal("online")),
    ),
    onlyIfNoActiveList: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.isArchived) throw new Error("Active list not found");
    await requireMembership(ctx, list.householdId, user._id);
    const household = await ctx.db.get(list.householdId);
    if (!household) throw new Error("Household not found");
    const currentActiveList = household.activeListId
      ? await ctx.db.get(household.activeListId)
      : null;
    if (
      shouldRejectNextShopClaim({
        currentActiveList,
        onlyIfNoActiveList: args.onlyIfNoActiveList ?? false,
      })
    ) {
      throw new Error("Another household member already chose a Next shop");
    }
    const now = Date.now();
    const listChanges: Partial<Doc<"lists">> & { updatedAt: number } = {
      updatedAt: now,
    };
    if (args.plannedFor !== undefined) listChanges.plannedFor = args.plannedFor;
    if (args.shoppingMode !== undefined) {
      listChanges.shoppingMode = args.shoppingMode;
    }
    await ctx.db.patch(list._id, listChanges);
    await ctx.db.patch(list.householdId, {
      activeListId: list._id,
      updatedAt: now,
    });
    return { success: true as const };
  },
});

export const updateProduct = mutation({
  args: {
    householdProductId: v.id("householdProducts"),
    displayName: v.optional(v.string()),
    category: v.optional(v.union(v.string(), v.null())),
    defaultQuantity: v.optional(v.union(v.number(), v.null())),
    defaultUnit: v.optional(v.union(v.string(), v.null())),
    cadenceDays: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"))),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const product = await ctx.db.get(args.householdProductId);
    if (!product) throw new Error("Household product not found");
    await requireMembership(ctx, product.householdId, user._id);
    const displayName = args.displayName?.trim();
    if (args.displayName !== undefined && !displayName) {
      throw new Error("Product name is required");
    }
    const updates: Partial<Doc<"householdProducts">> & {
      updatedAt: number;
    } = { updatedAt: Date.now() };
    if (displayName) {
      updates.displayName = displayName;
      updates.normalizedName = normalizeProductName(displayName);
    }
    if (args.category !== undefined) updates.category = args.category ?? undefined;
    if (args.defaultQuantity !== undefined) {
      updates.defaultQuantity = args.defaultQuantity ?? undefined;
    }
    if (args.defaultUnit !== undefined) {
      updates.defaultUnit = args.defaultUnit ?? undefined;
    }
    if (args.cadenceDays !== undefined) {
      updates.cadenceDays = clampCadenceDays(args.cadenceDays);
    }
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(product._id, updates);
    return { success: true as const };
  },
});

export const decide = mutation({
  args: {
    householdProductId: v.id("householdProducts"),
    decision: v.union(
      v.literal("add"),
      v.literal("still_have_some"),
      v.literal("not_this_time"),
      v.literal("stop_tracking"),
    ),
    operationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const product = await ctx.db.get(args.householdProductId);
    if (!product) throw new Error("Household product not found");
    await requireMembership(ctx, product.householdId, user._id);

    const household = await ctx.db.get(product.householdId);
    if (!household) throw new Error("Household not found");
    const activeListRecord = household.activeListId
      ? await ctx.db.get(household.activeListId)
      : null;
    const activeList = activeListRecord?.isArchived ? null : activeListRecord;
    const recentOperationIds = product.recentOperationIds ?? [];

    const findLinkedItem = async () => {
      if (!household.activeListId) return null;
      const items = await ctx.db
        .query("items")
        .withIndex("by_list", (query) =>
          query.eq("listId", household.activeListId!),
        )
        .collect();
      return (
        items.find(
          (item) =>
            item.isCompleted !== true &&
            (item.householdProductId === product._id ||
              (!item.householdProductId &&
                normalizeProductName(item.name) === product.normalizedName)),
        ) ?? null
      );
    };

    if (recentOperationIds.includes(args.operationId)) {
      const existingItem =
        args.decision === "add" ? await findLinkedItem() : null;
      return {
        applied: false as const,
        itemId: existingItem?._id,
      };
    }

    const result = applyRestockDecision({
      product: {
        id: product._id,
        displayName: product.displayName,
        status: product.status,
        cadenceDays: product.cadenceDays,
        lastPurchasedAt: product.lastPurchasedAt,
        activatedAt: product.createdAt,
        reviewAfter: product.reviewAfter,
        purchaseObservationCount: product.purchaseObservationCount,
      },
      decision: args.decision,
      nextShopAt: activeList?.plannedFor,
      now: Date.now(),
    });

    let itemId: Id<"items"> | undefined;
    if (result.addToShop) {
      if (!household.activeListId) {
        throw new Error("Choose a Next shop before adding restocks");
      }

      const existingItem = await findLinkedItem();
      if (existingItem && !existingItem.householdProductId) {
        await ctx.db.patch(existingItem._id, {
          householdProductId: product._id,
          updatedAt: Date.now(),
        });
      }
      itemId =
        existingItem?._id ??
        (await ctx.db.insert("items", {
          listId: household.activeListId,
          clientId: `restock:${product._id}:${args.operationId}`,
          householdProductId: product._id,
          name: product.displayName,
          quantity: product.defaultQuantity,
          unit: product.defaultUnit,
          category: product.category,
          isCompleted: false,
          addedBy: user._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));
    }

    await ctx.db.patch(product._id, {
      ...result.productChanges,
      recentOperationIds: [...recentOperationIds, args.operationId].slice(-20),
      updatedAt: Date.now(),
    });

    return { applied: true as const, itemId };
  },
});
