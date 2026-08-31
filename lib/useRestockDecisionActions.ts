import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAnalytics } from "./AnalyticsContext";
import { createOfflineId, type OfflineScope } from "./offlineQueue";
import { useScopedOfflineQueue } from "./useScopedOfflineQueue";

export type RestockDecision =
  | "add"
  | "still_have_some"
  | "not_this_time"
  | "stop_tracking";

export function useRestockDecisionActions({
  candidateProductIds,
  hasActiveList,
  householdId,
  isActive,
  marketCountryCode,
  source,
  userId,
}: {
  candidateProductIds?: readonly Id<"householdProducts">[];
  hasActiveList: boolean;
  householdId?: Id<"households">;
  isActive: boolean;
  marketCountryCode?: string;
  source: "plan" | "notification";
  userId?: string | null;
}) {
  const analytics = useAnalytics();
  const queueScope = useMemo<OfflineScope | null>(
    () =>
      isActive && userId && householdId
        ? { clerkUserId: userId, householdId }
        : null,
    [householdId, isActive, userId],
  );
  const { addToQueue, isOnline, queue } = useScopedOfflineQueue(queueScope);
  const decide = useMutation(api.restocks.decide);
  const recalculate = useMutation(api.notifications.recalculateForHousehold);
  const [pendingProductIds, setPendingProductIds] = useState(
    new Set<Id<"householdProducts">>(),
  );
  const [resolvedProductIds, setResolvedProductIds] = useState(
    new Set<Id<"householdProducts">>(),
  );
  const pendingProductIdsRef = useRef(new Set<Id<"householdProducts">>());
  const [error, setError] = useState<string | null>(null);
  const queuedProductIds = useMemo(
    () =>
      new Set(
        queue
          .filter((operation) => operation.type === "restocks.decide")
          .map((operation) => operation.args.householdProductId),
      ),
    [queue],
  );
  const hiddenProductIds = useMemo(
    () =>
      new Set([
        ...queuedProductIds,
        ...pendingProductIds,
        ...resolvedProductIds,
      ]),
    [pendingProductIds, queuedProductIds, resolvedProductIds],
  );

  useEffect(() => {
    if (!candidateProductIds) return;
    const currentCandidateIds = new Set(candidateProductIds);
    setResolvedProductIds((current) => {
      const next = new Set(
        [...current].filter((productId) => currentCandidateIds.has(productId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [candidateProductIds, resolvedProductIds]);

  const makeDecision = useCallback(
    async (
      householdProductId: Id<"householdProducts">,
      decision: RestockDecision,
    ) => {
      if (decision === "add" && !hasActiveList) {
        setError("Choose a Next shop before adding restocks.");
        return;
      }
      if (pendingProductIdsRef.current.has(householdProductId)) return;
      pendingProductIdsRef.current.add(householdProductId);
      setPendingProductIds(new Set(pendingProductIdsRef.current));
      setError(null);
      let decisionSaved = false;
      try {
        const operationId = createOfflineId("restock");
        if (isOnline) {
          await decide({ householdProductId, decision, operationId });
        } else {
          addToQueue({
            type: "restocks.decide",
            args: { householdProductId, decision, operationId },
          });
        }
        decisionSaved = true;
        setResolvedProductIds((current) =>
          new Set(current).add(householdProductId),
        );
      } catch (caughtError) {
        console.error("Couldn't save restock decision:", caughtError);
        setError("That change wasn't saved. Please try again.");
      } finally {
        pendingProductIdsRef.current.delete(householdProductId);
        setPendingProductIds(new Set(pendingProductIdsRef.current));
      }

      if (!decisionSaved) return;
      if (isOnline) {
        try {
          await recalculate({});
        } catch (recalculationError) {
          console.error("Couldn't refresh reminder timing:", recalculationError);
        }
      }
      try {
        analytics.track("restock decision made", {
          decision,
          source,
          market: marketCountryCode,
        });
      } catch (analyticsError) {
        console.error("Couldn't record restock analytics:", analyticsError);
      }
    }, [
      addToQueue,
      analytics,
      decide,
      hasActiveList,
      isOnline,
      marketCountryCode,
      recalculate,
      source,
    ],
  );

  return {
    error,
    hiddenProductIds,
    makeDecision,
    pendingProductIds,
  };
}
