import type { Id } from "@/convex/_generated/dataModel";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useRestockDecisionActions } from "./useRestockDecisionActions";

const mockDecide = jest.fn(
  async (_args: {
    householdProductId: string;
    decision: string;
    operationId: string;
  }): Promise<void> => undefined,
);
const mockRecalculate = jest.fn(
  async (_args?: Record<string, never>): Promise<void> => undefined,
);
const mockAddToQueue = jest.fn();
const mockDismissConflict = jest.fn();
const mockTrack = jest.fn();
const mockQueueState = {
  isOnline: true,
  queue: [] as { type: string; args: { householdProductId: string } }[],
  conflicts: [] as {
    id: string;
    householdProductId: string;
    type: "restocks.active_list_changed";
  }[],
};

jest.mock("@/convex/_generated/api", () => ({
  api: {
    notifications: { recalculateForHousehold: "recalculate" },
    restocks: { decide: "decide" },
  },
}));

jest.mock("convex/react", () => ({
  useMutation: (mutation: string) =>
    mutation === "decide" ? mockDecide : mockRecalculate,
}));

jest.mock("./AnalyticsContext", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

jest.mock("./useScopedOfflineQueue", () => ({
  useScopedOfflineQueue: () => ({
    addToQueue: mockAddToQueue,
    conflicts: mockQueueState.conflicts,
    dismissConflict: mockDismissConflict,
    isOnline: mockQueueState.isOnline,
    queue: mockQueueState.queue,
  }),
}));

describe("useRestockDecisionActions", () => {
  const householdProductId = "product_1" as Id<"householdProducts">;
  let actions!: ReturnType<typeof useRestockDecisionActions>;

  function Harness({
    candidateProductIds = [householdProductId],
    hasActiveList = true,
  }: {
    candidateProductIds?: readonly Id<"householdProducts">[];
    hasActiveList?: boolean;
  }) {
    actions = useRestockDecisionActions({
      candidateProductIds,
      activeListId: hasActiveList
        ? ("list_1" as Id<"lists">)
        : undefined,
      householdId: "household_1" as Id<"households">,
      marketCountryCode: "GB",
      source: "plan",
      userId: "clerk_1",
    });
    return null;
  }

  beforeEach(() => {
    mockDecide.mockClear();
    mockRecalculate.mockClear();
    mockAddToQueue.mockClear();
    mockDismissConflict.mockClear();
    mockTrack.mockClear();
    mockDecide.mockResolvedValue(undefined);
    mockRecalculate.mockResolvedValue(undefined);
    mockQueueState.isOnline = true;
    mockQueueState.queue = [];
    mockQueueState.conflicts = [];
  });

  it("applies and recalculates an online decision", async () => {
    act(() => {
      TestRenderer.create(<Harness />);
    });

    await act(async () => {
      await actions.makeDecision(householdProductId, "add");
    });

    expect(mockDecide).toHaveBeenCalledWith({
      householdProductId,
      decision: "add",
      expectedActiveListId: "list_1",
      operationId: expect.stringMatching(/^restock_/),
    });
    expect(mockRecalculate).toHaveBeenCalledWith({});
    expect(mockAddToQueue).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith("restock decision made", {
      decision: "add",
      market: "GB",
      source: "plan",
    });
    expect(actions.hiddenProductIds.has(householdProductId)).toBe(true);
  });

  it("queues the same absolute decision when offline", async () => {
    mockQueueState.isOnline = false;
    act(() => {
      TestRenderer.create(<Harness />);
    });

    await act(async () => {
      await actions.makeDecision(householdProductId, "not_this_time");
    });

    expect(mockAddToQueue).toHaveBeenCalledWith({
      type: "restocks.decide",
      args: {
        householdProductId,
        decision: "not_this_time",
        operationId: expect.stringMatching(/^restock_/),
      },
    });
    expect(mockDecide).not.toHaveBeenCalled();
    expect(mockRecalculate).not.toHaveBeenCalled();
  });

  it("binds an offline Add to the current Next shop", async () => {
    mockQueueState.isOnline = false;
    act(() => {
      TestRenderer.create(<Harness />);
    });

    await act(async () => {
      await actions.makeDecision(householdProductId, "add");
    });

    expect(mockAddToQueue).toHaveBeenCalledWith({
      type: "restocks.decide",
      args: {
        householdProductId,
        decision: "add",
        expectedActiveListId: "list_1",
        operationId: expect.stringMatching(/^restock_/),
      },
    });
  });

  it("does not queue an Add that cannot succeed without a Next shop", async () => {
    mockQueueState.isOnline = false;
    act(() => {
      TestRenderer.create(<Harness hasActiveList={false} />);
    });

    await act(async () => {
      await actions.makeDecision(householdProductId, "add");
    });

    expect(mockAddToQueue).not.toHaveBeenCalled();
    expect(mockDecide).not.toHaveBeenCalled();
    expect(actions.error).toBe(
      "Choose a Next shop before adding restocks.",
    );
  });

  it("keeps a committed decision successful when reminder refresh fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    mockRecalculate.mockRejectedValueOnce(new Error("temporary failure"));
    act(() => {
      TestRenderer.create(<Harness />);
    });

    await act(async () => {
      await actions.makeDecision(householdProductId, "still_have_some");
    });

    expect(mockDecide).toHaveBeenCalledTimes(1);
    expect(actions.error).toBeNull();
    expect(actions.hiddenProductIds.has(householdProductId)).toBe(true);
    expect(mockTrack).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("surfaces and clears an intended-list conflict before retrying", async () => {
    mockQueueState.conflicts = [
      {
        id: "operation_1",
        householdProductId,
        type: "restocks.active_list_changed",
      },
    ];
    act(() => {
      TestRenderer.create(<Harness />);
    });

    expect(actions.error).toBe(
      "Your Next shop changed before that item was added. Review it again.",
    );

    await act(async () => {
      await actions.makeDecision(householdProductId, "add");
    });

    expect(mockDismissConflict).toHaveBeenCalledWith("operation_1");
  });

  it("allows a product to reappear in a later review cycle", async () => {
    let setCandidateProductIds!: React.Dispatch<
      React.SetStateAction<readonly Id<"householdProducts">[]>
    >;

    function ReconciliationHarness() {
      const [candidateProductIds, setCandidates] = React.useState<
        readonly Id<"householdProducts">[]
      >([householdProductId]);
      setCandidateProductIds = setCandidates;
      return <Harness candidateProductIds={candidateProductIds} />;
    }

    act(() => {
      TestRenderer.create(<ReconciliationHarness />);
    });

    await act(async () => {
      await actions.makeDecision(householdProductId, "not_this_time");
    });
    expect(actions.hiddenProductIds.has(householdProductId)).toBe(true);

    act(() => {
      setCandidateProductIds([]);
    });
    act(() => {
      setCandidateProductIds([householdProductId]);
    });

    expect(actions.hiddenProductIds.has(householdProductId)).toBe(false);
  });

  it("tracks overlapping product decisions independently", async () => {
    const secondProductId = "product_2" as Id<"householdProducts">;
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    mockDecide.mockImplementation(
      ({ householdProductId: currentProductId }: { householdProductId: string }) =>
        new Promise<void>((resolve) => {
          if (currentProductId === householdProductId) resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
    );
    act(() => {
      TestRenderer.create(<Harness />);
    });

    let firstDecision!: Promise<void>;
    let secondDecision!: Promise<void>;
    act(() => {
      firstDecision = actions.makeDecision(householdProductId, "add");
      secondDecision = actions.makeDecision(secondProductId, "not_this_time");
    });
    expect(actions.pendingProductIds).toEqual(
      new Set([householdProductId, secondProductId]),
    );

    await act(async () => {
      resolveFirst();
      await firstDecision;
    });
    expect(actions.pendingProductIds).toEqual(new Set([secondProductId]));

    await act(async () => {
      resolveSecond();
      await secondDecision;
    });
    expect(actions.pendingProductIds.size).toBe(0);
  });
});
