import { useEffect, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useIsOnline } from "./useNetworkStatus";
import {
  cacheLists,
  getCachedLists,
  cacheItems,
  getCachedItems,
  cacheListDetail,
  getCachedListDetail,
  cacheHousehold,
  getCachedHousehold,
} from "./storage";

/**
 * Type for list with item counts (matches what getByHousehold returns)
 */
export interface ListWithCounts {
  _id: Id<"lists">;
  _creationTime: number;
  name: string;
  category?: string;
  tripBudgetPence?: number;
  isArchived: boolean;
  householdId: Id<"households">;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  totalItems: number;
  completedItems: number;
}

/**
 * Type for item with addedByUser (matches what getByList returns)
 */
export interface ItemWithUser {
  _id: Id<"items">;
  _creationTime: number;
  listId: Id<"lists">;
  clientId?: string;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  category?: string;
  estimatedPricePence?: number;
  isCompleted: boolean;
  addedBy: Id<"users">;
  completedBy?: Id<"users">;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  addedByUser?: {
    _id: Id<"users">;
    name?: string;
    imageUrl?: string;
  } | null;
  /** Whether this item is pending sync (created/modified offline) */
  isPendingSync?: boolean;
  /** The offline queue mutation ID for tracking */
  pendingMutationId?: string;
}

/**
 * Return type for cached query hooks
 */
interface CachedQueryResult<T> {
  /** The data (from server or cache) */
  data: T | undefined;
  /** Whether the data is from cache (offline mode) */
  isFromCache: boolean;
  /** Whether the query is loading (no data yet) */
  isLoading: boolean;
}

export interface HouseholdDetail {
  _id: Id<"households">;
  _creationTime: number;
  name: string;
  inviteCode: string;
  ownerId: Id<"users">;
  monthlyBudgetPence?: number;
  createdAt: number;
  updatedAt: number;
  userRole: "owner" | "member";
  members: unknown[];
}

/** Cache the current household per Clerk user for cold offline Home launches. */
export function useCachedHousehold(
  clerkUserId: string | null | undefined,
): CachedQueryResult<HouseholdDetail | null> {
  const isOnline = useIsOnline();
  const household = useQuery(
    api.households.getCurrentHousehold,
    clerkUserId && isOnline ? {} : "skip",
  );

  useEffect(() => {
    if (household && clerkUserId && isOnline) {
      cacheHousehold(clerkUserId, household);
    }
  }, [clerkUserId, household, isOnline]);

  const cachedHousehold = useMemo(() => {
    if (!clerkUserId) return null;
    if (!isOnline) {
      return getCachedHousehold<HouseholdDetail>(clerkUserId, Infinity);
    }
    if (household === undefined) {
      return getCachedHousehold<HouseholdDetail>(clerkUserId);
    }
    return null;
  }, [clerkUserId, household, isOnline]);

  const data =
    isOnline && household !== undefined
      ? household
      : cachedHousehold ?? household;
  return {
    data,
    isFromCache: cachedHousehold !== null && household === undefined,
    isLoading: data === undefined,
  };
}

export interface ListDetail {
  _id: Id<"lists">;
  _creationTime: number;
  name: string;
  category?: string;
  tripBudgetPence?: number;
  isArchived: boolean;
  householdId: Id<"households">;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

/** Cache list metadata so an already-visited list can open after a cold offline launch. */
export function useCachedList(
  listId: Id<"lists">,
  clerkUserId: string | null | undefined,
): CachedQueryResult<ListDetail | null> {
  const isOnline = useIsOnline();
  const list = useQuery(
    api.lists.getById,
    clerkUserId && isOnline ? { listId } : "skip",
  );

  useEffect(() => {
    if (list && clerkUserId && isOnline) {
      cacheListDetail(clerkUserId, listId, list);
    }
  }, [clerkUserId, isOnline, list, listId]);

  const cachedList = useMemo(() => {
    if (!clerkUserId) return null;
    if (!isOnline) {
      return getCachedListDetail<ListDetail>(clerkUserId, listId, Infinity);
    }
    if (list === undefined) {
      return getCachedListDetail<ListDetail>(clerkUserId, listId);
    }
    return null;
  }, [clerkUserId, isOnline, list, listId]);

  const data = isOnline && list !== undefined ? list : cachedList ?? list;
  return {
    data,
    isFromCache: cachedList !== null && list === undefined,
    isLoading: data === undefined,
  };
}

/**
 * Hook to fetch lists with MMKV caching support.
 * - Caches lists to MMKV after successful query when online
 * - Returns cached data when offline
 * - Cache expires after 5 minutes when online
 */
export function useCachedLists(
  householdId: Id<"households"> | undefined
): CachedQueryResult<ListWithCounts[]> {
  const isOnline = useIsOnline();
  const hasInitializedCache = useRef(false);

  // Fetch from Convex when online and householdId is available
  const lists = useQuery(
    api.lists.getByHousehold,
    householdId && isOnline ? { householdId } : "skip"
  );

  // Cache the lists when they're successfully loaded
  useEffect(() => {
    if (lists && householdId && isOnline) {
      cacheLists(householdId, lists);
    }
  }, [lists, householdId, isOnline]);

  // Get cached data for offline mode
  const cachedLists = useMemo(() => {
    if (!householdId) return null;

    if (!isOnline) {
      // When offline, always use cache regardless of age
      return getCachedLists<ListWithCounts[]>(householdId, Infinity);
    }

    // When online, only use cache if query hasn't returned yet
    if (lists === undefined && !hasInitializedCache.current) {
      hasInitializedCache.current = true;
      return getCachedLists<ListWithCounts[]>(householdId);
    }

    return null;
  }, [householdId, isOnline, lists]);

  // Determine the final data to return
  const data = useMemo(() => {
    // When online, prefer fresh data from query
    if (isOnline && lists !== undefined) {
      return lists;
    }
    // When offline or query is loading, use cached data
    if (cachedLists !== null) {
      return cachedLists;
    }
    // Return query data even if it's undefined (loading state)
    return lists;
  }, [isOnline, lists, cachedLists]);

  const isFromCache = !isOnline && cachedLists !== null && lists === undefined;
  const isLoading = data === undefined;

  return { data, isFromCache, isLoading };
}

/**
 * Hook to fetch items for a list with MMKV caching support.
 * - Caches items to MMKV after successful query when online
 * - Returns cached data when offline
 * - Cache expires after 5 minutes when online
 */
export function useCachedItems(
  listId: Id<"lists"> | undefined
): CachedQueryResult<ItemWithUser[]> {
  const isOnline = useIsOnline();
  const hasInitializedCache = useRef(false);

  // Fetch from Convex when online and listId is available
  const items = useQuery(
    api.items.getByList,
    listId && isOnline ? { listId } : "skip"
  );

  // Cache the items when they're successfully loaded
  useEffect(() => {
    if (items && listId && isOnline) {
      cacheItems(listId, items);
    }
  }, [items, listId, isOnline]);

  // Get cached data for offline mode
  const cachedItems = useMemo(() => {
    if (!listId) return null;

    if (!isOnline) {
      // When offline, always use cache regardless of age
      return getCachedItems<ItemWithUser[]>(listId, Infinity);
    }

    // When online, only use cache if query hasn't returned yet
    if (items === undefined && !hasInitializedCache.current) {
      hasInitializedCache.current = true;
      return getCachedItems<ItemWithUser[]>(listId);
    }

    return null;
  }, [listId, isOnline, items]);

  // Determine the final data to return
  const data = useMemo(() => {
    // When online, prefer fresh data from query
    if (isOnline && items !== undefined) {
      return items;
    }
    // When offline or query is loading, use cached data
    if (cachedItems !== null) {
      return cachedItems;
    }
    // Return query data even if it's undefined (loading state)
    return items;
  }, [isOnline, items, cachedItems]);

  const isFromCache = !isOnline && cachedItems !== null && items === undefined;
  const isLoading = data === undefined;

  return { data, isFromCache, isLoading };
}
