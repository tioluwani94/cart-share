import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useMemo } from "react";
import { getItem, setItem } from "./storage";
import { useIsOnline } from "./useNetworkStatus";

type RestockReview = FunctionReturnType<typeof api.restocks.getReview>;

function cacheKey(
  clerkUserId: string,
  householdId: Id<"households">,
): string {
  return `restock:review:${encodeURIComponent(clerkUserId)}:${householdId}`;
}

export function useCachedRestockReview(
  clerkUserId: string | null | undefined,
  householdId: Id<"households"> | undefined,
) {
  const isOnline = useIsOnline();
  const liveReview = useQuery(
    api.restocks.getReview,
    clerkUserId && householdId && isOnline ? {} : "skip",
  );

  useEffect(() => {
    if (liveReview && clerkUserId && householdId) {
      setItem(cacheKey(clerkUserId, householdId), liveReview);
    }
  }, [clerkUserId, householdId, liveReview]);

  const cachedReview = useMemo(
    () =>
      clerkUserId && householdId
        ? getItem<RestockReview>(cacheKey(clerkUserId, householdId))
        : null,
    [clerkUserId, householdId],
  );

  return {
    data: liveReview ?? cachedReview ?? undefined,
    isFromCache: liveReview === undefined && cachedReview !== null,
    isOnline,
  };
}
