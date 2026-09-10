import { Button, EmptyStateCard, ProgressBar } from "@/components/ui";
import type { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateWithWeekday, formatFriendlyDate } from "@/lib/formatters";
import { quickCheckEmptyKind, quickCheckProgress } from "@/lib/quickCheck";
import type {
  RestockDecision,
  RestockDecisionOutcome,
} from "@/lib/useRestockDecisionActions";
import type { FunctionReturnType } from "convex/server";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { QuickCheckCard } from "./QuickCheckCard";

type Review = FunctionReturnType<typeof api.restocks.getReview>;
type Candidate = Review["candidates"][number];
type LastChoice = {
  candidate: Candidate;
  undoId: Id<"restockUndoRecords">;
  expiresAt: number;
};

export function QuickCheckSection({
  review,
  hiddenIds,
  error,
  isOnline,
  makeDecision,
  undoDecision,
  onShop,
  onPantry,
  onChooseRegulars,
  fromNotification = false,
  isReviewFromCache = false,
}: {
  review: Review;
  hiddenIds: ReadonlySet<Id<"householdProducts">>;
  error: string | null;
  isOnline: boolean;
  makeDecision: (
    id: Id<"householdProducts">,
    decision: RestockDecision,
  ) => Promise<RestockDecisionOutcome>;
  undoDecision: (id: Id<"restockUndoRecords">) => Promise<boolean>;
  onShop: () => void;
  onPantry: () => void;
  onChooseRegulars: () => void;
  fromNotification?: boolean;
  isReviewFromCache?: boolean;
}) {
  const eligible = useMemo(
    () =>
      review.candidates.filter(
        (c) => !c.isAdded && !hiddenIds.has(c.householdProductId),
      ),
    [review.candidates, hiddenIds],
  );
  const latest = useRef(eligible);
  latest.current = eligible;
  const [session, setSession] = useState(() => eligible);
  const [decisions, setDecisions] = useState<Record<string, RestockDecision>>(
    {},
  );
  const [busy, setBusy] = useState<Candidate | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [last, setLast] = useState<LastChoice | null>(null);
  const [restored, setRestored] = useState<Candidate | null>(null);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const locked = useRef(false);
  const reset = useCallback(() => {
    generation.current++;
    locked.current = false;
    setSession(latest.current);
    setDecisions({});
    setLast(null);
    setRestored(null);
    setMessage("");
    setBusy(null);
    setUndoing(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      reset();
      return () => {
        generation.current++;
      };
    }, [reset]),
  );
  useEffect(() => {
    // A cached/quiet initial review must not permanently freeze an empty queue.
    // Once a check has started, keep its denominator and Undo intact.
    if (session.length === 0 && eligible.length > 0) {
      setSession(eligible);
    }
  }, [eligible, session.length]);
  useEffect(() => {
    if (!last) return;
    const timer = setTimeout(
      () => setLast(null),
      Math.max(0, last.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [last]);
  useEffect(() => {
    if (
      restored &&
      eligible.some((c) => c.householdProductId === restored.householdProductId)
    )
      setRestored(null);
  }, [eligible, restored]);
  const remaining = session.filter(
    (c) =>
      !decisions[c.householdProductId] &&
      (eligible.some((p) => p.householdProductId === c.householdProductId) ||
        restored?.householdProductId === c.householdProductId ||
        busy?.householdProductId === c.householdProductId),
  );
  const candidate =
    busy ??
    eligible.find(
      (c) => c.householdProductId === remaining[0]?.householdProductId,
    ) ??
    remaining[0];
  const progress = quickCheckProgress(
    session.map((c) => c.householdProductId),
    remaining.map((c) => c.householdProductId),
  );
  const newCandidates = eligible.filter(
    (c) => !session.some((p) => p.householdProductId === c.householdProductId),
  );
  const decide = async (decision: RestockDecision) => {
    if (locked.current || !candidate) return;
    locked.current = true;
    const token = generation.current;
    setBusy(candidate);
    setMessage("");
    try {
      const result = await makeDecision(candidate.householdProductId, decision);
      if (token !== generation.current || !result.saved) return;
      setDecisions((d) => ({ ...d, [candidate.householdProductId]: decision }));
      setLast(null);
      setRestored(null);
      if (result.undoId && result.undoExpiresAt)
        setLast({
          candidate,
          undoId: result.undoId,
          expiresAt: result.undoExpiresAt,
        });
      setMessage(
        result.queued
          ? "Saved on this device. Your choice will sync when you reconnect; Undo isn’t available for queued choices."
          : decision === "add"
            ? `${candidate.displayName} added to Shop.`
            : decision === "still_have_some"
              ? `${candidate.displayName} will be checked again later.`
              : `${candidate.displayName} left for another check.`,
      );
    } finally {
      if (token === generation.current) {
        locked.current = false;
        setBusy(null);
      }
    }
  };
  const undo = async () => {
    if (!last || locked.current) return;
    locked.current = true;
    setUndoing(true);
    const token = generation.current;
    try {
      const success = await undoDecision(last.undoId);
      if (token !== generation.current || !success) return;
      setDecisions((d) => {
        const next = { ...d };
        delete next[last.candidate.householdProductId];
        return next;
      });
      setRestored(last.candidate);
      setMessage("Last choice undone.");
      setLast(null);
    } finally {
      if (token === generation.current) {
        locked.current = false;
        setUndoing(false);
      }
    }
  };
  const kind = quickCheckEmptyKind({
    total: progress.total,
    tracked: review.trackedProductCount,
    active: review.activeProductCount ?? review.trackedProductCount,
    learning: review.learningProductCount,
  });
  const emptyCopy = {
    done: [
      "That’s the check done.",
      Object.values(decisions).includes("add")
        ? "Your choices are saved. Open Shop to see your household’s list."
        : "Nothing added this time. Your regulars will come back for another check.",
    ],
    quiet: [
      "Nothing to check right now.",
      "Your Pantry is up to date. We’ll bring your regulars back when it’s time for a quick check.",
    ],
    new: [
      "Your regulars start here.",
      "Choose the things your household buys often. We’ll help you remember to check them.",
    ],
    learning: [
      "Getting to know your regulars.",
      "Your completed shops are helping your Pantry learn. Review products there when you’re ready to track them.",
    ],
    paused: [
      "Your reminders are paused.",
      "You can resume tracking products in Pantry whenever you’re ready.",
    ],
  }[kind];
  const pantryAction =
    kind === "new" || kind === "learning" || kind === "paused";
  const showNotificationEmpty =
    fromNotification &&
    !candidate &&
    eligible.length === 0 &&
    Object.keys(decisions).length === 0;
  // Keep completion/Undo and setup guidance, but no placeholder for a quiet pantry.
  if (
    !candidate &&
    kind === "quiet" &&
    !error &&
    !showNotificationEmpty &&
    newCandidates.length === 0
  )
    return null;
  return (
    <View className="mb-7">
      {candidate && (
        <>
          <Text
            accessibilityRole="header"
            className="font-heading text-2xl leading-8 text-ink"
          >
            A quick kitchen check.
          </Text>
          <Text className="mt-2 text-base leading-6 text-ink-secondary">
            You know your kitchen. We remember the regulars.
          </Text>
        </>
      )}
      {progress.total > 0 && (
        <View className="mt-4 h-2 flex-row">
          <ProgressBar
            size="compact"
            value={progress.checked}
            max={progress.total}
            accessibilityLabel="Restock review progress"
          />
        </View>
      )}
      {candidate ? (
        <QuickCheckCard
          key={candidate.householdProductId}
          name={candidate.displayName}
          note={
            candidate.lastPurchasedAt
              ? `Last bought ${formatFriendlyDate(candidate.lastPurchasedAt, Date.now(), { locale: review.household.locale, timeZone: review.household.planningTimeZone })}`
              : `Usually bought every ${candidate.cadenceDays} days`
          }
          explanation={`Based on the saved dates and your current ${candidate.cadenceDays}-day rhythm, it may be due around ${formatDateWithWeekday(candidate.expectedDueAt, { locale: review.household.locale, timeZone: review.household.planningTimeZone })}. You can adjust the rhythm or pause tracking in Pantry.`}
          remaining={remaining.length}
          canAdd={Boolean(review.activeList)}
          busy={Boolean(busy) || undoing}
          onDecision={decide}
        />
      ) : showNotificationEmpty ? (
        <EmptyStateCard
          className="mt-4"
          title={
            isReviewFromCache
              ? "No checks in your saved plan"
              : "Nothing needs checking now"
          }
          description={
            isReviewFromCache
              ? isOnline
                ? "Refreshing your household’s latest plan…"
                : "Reconnect to check your household’s latest plan."
              : review.activeList
                ? "Your household may have already handled these suggestions. Open Shop to see the current list."
                : "Your household may have already handled these suggestions. Choose a Next shop below when you’re ready."
          }
          artworkSource={require("@/assets/empty-states/plan-complete.png")}
          actionLabel={review.activeList ? "View list" : undefined}
          onAction={review.activeList ? onShop : undefined}
        />
      ) : kind !== "quiet" ? (
        <EmptyStateCard
          className="mt-4"
          title={emptyCopy[0]}
          description={emptyCopy[1]}
          artworkSource={
            kind === "done"
              ? require("@/assets/empty-states/plan-complete.png")
              : pantryAction
                ? require("@/assets/empty-states/grocery-rhythm.png")
                : require("@/assets/empty-states/empty-basket.png")
          }
          actionLabel={
            kind === "new"
              ? "Choose a few regulars"
              : pantryAction
                ? "Open Pantry"
                : "View list"
          }
          onAction={
            kind === "new" ? onChooseRegulars : pantryAction ? onPantry : onShop
          }
        />
      ) : null}
      {error && (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-center text-sm leading-5 text-coral"
        >
          {error}
        </Text>
      )}
      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          className="mt-3 text-center text-sm leading-5 text-ink-secondary"
        >
          {message}
        </Text>
      )}
      {last && (
        <>
          <Button
            variant="ghost"
            disabled={Boolean(busy) || undoing || !isOnline}
            loading={undoing}
            onPress={() => void undo()}
            accessibilityLabel={`Undo choice for ${last.candidate.displayName}`}
            className="mt-1"
          >
            Undo last choice
          </Button>
          {!isOnline && (
            <Text className="text-center text-sm text-ink-secondary">
              Reconnect to undo safely.
            </Text>
          )}
        </>
      )}
      {!candidate && newCandidates.length > 0 && (
        <Button variant="outline" onPress={reset} className="mt-3">
          Check new suggestions
        </Button>
      )}
    </View>
  );
}
