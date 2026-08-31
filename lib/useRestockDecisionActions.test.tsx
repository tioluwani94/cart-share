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
const mockTrack = jest.fn();
const mockQueueState = {
  isOnline: true,
  queue: [] as { type: string; args: { householdProductId: string } }[],
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
    isOnline: mockQueueState.isOnline,
    queue: mockQueueState.queue,
  }),
}));

describe("useRestockDecisionActions", () => {
  const householdProductId = "product_1" as Id<"householdProducts">;
  let actions!: ReturnType<typeof useRestockDecisionActions>;

  function Harness() {
    actions = useRestockDecisionActions({
      householdId: "household_1" as Id<"households">,
      isActive: true,
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
    mockTrack.mockClear();
    mockDecide.mockResolvedValue(undefined);
    mockRecalculate.mockResolvedValue(undefined);
    mockQueueState.isOnline = true;
    mockQueueState.queue = [];
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
