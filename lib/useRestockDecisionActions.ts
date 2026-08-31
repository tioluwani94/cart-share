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

const ACTIVE_LIST_CONFLICT_MESSAGE =
  "Your Next shop changed before that item was added. Review it again.";

function hasActiveListConflict(
  result: unknown,
): result is { conflict: "active_list_changed" } {
  return (
    typeof result === "object" &&
    result !== null &&
    "conflict" in result &&
    result.conflict === "active_list_changed"
  );
}

export function useRestockDecisionActions({
  activeListId,
  candidateProductIds,
  householdId,
  marketCountryCode,
  source,
  userId,
}: {
  activeListId?: Id<"lists">;
  candidateProductIds?: readonly Id<"householdProducts">[];
  householdId?: Id<"households">;
  marketCountryCode?: string;
  source: "plan" | "notification";
  userId?: string | null;
}) {
  const analytics = useAnalytics();
  const queueScope = useMemo<OfflineScope | null>(
    () =>
      userId && householdId
        ? { clerkUserId: userId, householdId }
        : null,
    [householdId, userId],
  );
  const {
    addToQueue,
    conflicts,
    dismissConflict,
    isOnline,
    queue,
  } = useScopedOfflineQueue(queueScope);
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
  const activeListConflicts = useMemo(
    () =>
      conflicts.filter(
        (conflict) => conflict.type === "restocks.active_list_changed",
      ),
    [conflicts],
  );
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
      if (decision === "add" && !activeListId) {
        setError("Choose a Next shop before adding restocks.");
        return;
      }
      activeListConflicts
        .filter(
          (conflict) =>
            conflict.householdProductId === householdProductId,
        )
        .forEach((conflict) => dismissConflict(conflict.id));
      if (pendingProductIdsRef.current.has(householdProductId)) return;
      pendingProductIdsRef.current.add(householdProductId);
      setPendingProductIds(new Set(pendingProductIdsRef.current));
      setError(null);
      let decisionSaved = false;
      try {
        const operationId = createOfflineId("restock");
        const args =
          decision === "add"
            ? {
                householdProductId,
                decision,
                operationId,
                expectedActiveListId: activeListId!,
              }
            : { householdProductId, decision, operationId };
        if (isOnline) {
          const result = await decide(args);
          if (hasActiveListConflict(result)) {
            setError(ACTIVE_LIST_CONFLICT_MESSAGE);
            return;
          }
        } else {
          addToQueue({
            type: "restocks.decide",
            args,
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
      activeListConflicts,
      activeListId,
      analytics,
      decide,
      dismissConflict,
      isOnline,
      marketCountryCode,
      recalculate,
      source,
    ],
  );

  return {
    error:
      error ??
      (activeListConflicts.length > 0
        ? ACTIVE_LIST_CONFLICT_MESSAGE
        : null),
    hiddenProductIds,
    makeDecision,
    pendingProductIds,
  };
}
