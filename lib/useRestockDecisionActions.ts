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

export type RestockDecisionOutcome = {
  saved: boolean;
  queued?: boolean;
  undoId?: Id<"restockUndoRecords">;
  undoExpiresAt?: number;
};

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
  enableUndo = false,
}: {
  activeListId?: Id<"lists">;
  candidateProductIds?: readonly Id<"householdProducts">[];
  householdId?: Id<"households">;
  marketCountryCode?: string;
  source: "plan" | "notification";
  userId?: string | null;
  enableUndo?: boolean;
}) {
  const analytics = useAnalytics();
  const queueScope = useMemo<OfflineScope | null>(
    () => (userId && householdId ? { clerkUserId: userId, householdId } : null),
    [householdId, userId],
  );
  const { addToQueue, conflicts, dismissConflict, isOnline, queue } =
    useScopedOfflineQueue(queueScope);
  const decide = useMutation(api.restocks.decide);
  const undoMutation = useMutation(api.restocks.undoDecision);
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
    ): Promise<RestockDecisionOutcome> => {
      if (decision === "add" && !activeListId) {
        setError("Choose a Next shop before adding restocks.");
        return { saved: false };
      }
      activeListConflicts
        .filter(
          (conflict) => conflict.householdProductId === householdProductId,
        )
        .forEach((conflict) => dismissConflict(conflict.id));
      if (pendingProductIdsRef.current.has(householdProductId))
        return { saved: false };
      pendingProductIdsRef.current.add(householdProductId);
      setPendingProductIds(new Set(pendingProductIdsRef.current));
      setError(null);
      let decisionSaved = false;
      let outcome: RestockDecisionOutcome = { saved: false };
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
          const result = await decide({
            ...args,
            ...(enableUndo ? { enableUndo: true } : {}),
          });
          if (hasActiveListConflict(result)) {
            setError(ACTIVE_LIST_CONFLICT_MESSAGE);
            return { saved: false };
          }
          outcome = {
            saved: true,
            undoId: result && "undoId" in result ? result.undoId : undefined,
            undoExpiresAt:
              result && "undoExpiresAt" in result
                ? result.undoExpiresAt
                : undefined,
          };
        } else {
          addToQueue({
            type: "restocks.decide",
            args,
          });
          outcome = { saved: true, queued: true };
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

      if (!decisionSaved) return { saved: false };
      if (isOnline) {
        try {
          await recalculate({});
        } catch (recalculationError) {
          console.error(
            "Couldn't refresh reminder timing:",
            recalculationError,
          );
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
      return outcome;
    },
    [
      addToQueue,
      activeListConflicts,
      activeListId,
      analytics,
      enableUndo,
      decide,
      dismissConflict,
      isOnline,
      marketCountryCode,
      recalculate,
      source,
    ],
  );

  const undoDecision = useCallback(
    async (undoId: Id<"restockUndoRecords">) => {
      if (!isOnline) {
        setError("Reconnect to undo this change safely.");
        return false;
      }
      setError(null);
      try {
        const result = await undoMutation({ undoId });
        if (!result.undone) {
          setError(
            result.reason === "changed"
              ? "This product or shop has changed since your choice. Nothing was undone."
              : "This choice can no longer be undone.",
          );
          return false;
        }
        setResolvedProductIds((current) => {
          const next = new Set(current);
          next.delete(result.productId);
          return next;
        });
        try {
          await recalculate({});
        } catch (error) {
          console.error("Couldn't refresh reminder timing after Undo:", error);
        }
        return true;
      } catch (error) {
        console.error("Couldn't undo restock decision:", error);
        setError("Undo wasn't saved. Please try again.");
        return false;
      }
    },
    [isOnline, recalculate, undoMutation],
  );

  return {
    error:
      error ??
      (activeListConflicts.length > 0 ? ACTIVE_LIST_CONFLICT_MESSAGE : null),
    hiddenProductIds,
    makeDecision,
    pendingProductIds,
    undoDecision,
  };
}
