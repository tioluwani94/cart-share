import type { Id } from "@/convex/_generated/dataModel";
import React from "react";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";
import type { OfflineScope } from "./offlineQueue";
import {
  OfflineQueueProvider,
  useScopedOfflineQueue,
} from "./useScopedOfflineQueue";

const mockStoredValues = new Map<string, unknown>();

jest.mock("@/convex/_generated/api", () => ({
  api: {
    items: {
      add: "items.add",
      remove: "items.remove",
      setCompleted: "items.setCompleted",
      update: "items.update",
    },
    notifications: { recalculateForHousehold: "notifications.recalculate" },
    restocks: { decide: "restocks.decide" },
    sessions: { completeOffline: "sessions.completeOffline" },
  },
}));

jest.mock("convex/react", () => ({
  useMutation: () => jest.fn(async () => ({ applied: true })),
}));

jest.mock("./useNetworkStatus", () => ({
  useNetworkStatus: () => ({ isConnected: false }),
}));

jest.mock("./SyncStatusContext", () => ({
  useSyncStatusSafe: () => null,
}));

jest.mock("./storage", () => ({
  StorageKeys: { OFFLINE_QUEUE: "legacy:offline-queue" },
  getItem: (key: string) => mockStoredValues.get(key),
  removeItem: (key: string) => mockStoredValues.delete(key),
  setItem: (key: string, value: unknown) => mockStoredValues.set(key, value),
}));

const firstScope: OfflineScope = {
  clerkUserId: "clerk_1",
  householdId: "household_1" as Id<"households">,
};
const secondScope: OfflineScope = {
  clerkUserId: "clerk_2",
  householdId: "household_2" as Id<"households">,
};

describe("OfflineQueueProvider", () => {
  beforeEach(() => mockStoredValues.clear());

  it("shares one coordinator across route consumers", () => {
    const consumers: ReturnType<typeof useScopedOfflineQueue>[] = [];

    function Consumer() {
      consumers.push(useScopedOfflineQueue(firstScope));
      return null;
    }

    act(() => {
      TestRenderer.create(
        <OfflineQueueProvider scope={firstScope}>
          <Consumer />
          <Consumer />
        </OfflineQueueProvider>,
      );
    });

    act(() => {
      consumers.at(-2)!.addToQueue({
        type: "items.add",
        args: {
          listId: "list_1" as Id<"lists">,
          clientId: "client_1",
          name: "Milk",
        },
      });
    });

    expect(consumers.at(-2)!.queueLength).toBe(1);
    expect(consumers.at(-1)!.queueLength).toBe(1);
    expect(consumers.at(-2)!.processQueue).toBe(
      consumers.at(-1)!.processQueue,
    );
  });

  it("remounts cleanly when another user and household signs in", () => {
    let current!: ReturnType<typeof useScopedOfflineQueue>;

    function Consumer({ scope }: { scope: OfflineScope }) {
      current = useScopedOfflineQueue(scope);
      return null;
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <OfflineQueueProvider scope={firstScope}>
          <Consumer scope={firstScope} />
        </OfflineQueueProvider>,
      );
    });
    act(() => {
      current.addToQueue({
        type: "items.add",
        args: {
          listId: "list_1" as Id<"lists">,
          clientId: "client_1",
          name: "Milk",
        },
      });
    });
    expect(current.queueLength).toBe(1);

    act(() => {
      (
        renderer as ReactTestRenderer & {
          update: (element: React.ReactElement) => void;
        }
      ).update(
        <OfflineQueueProvider scope={secondScope}>
          <Consumer scope={secondScope} />
        </OfflineQueueProvider>,
      );
    });

    expect(current.queueLength).toBe(0);
    expect(current.conflicts).toEqual([]);
    expect(current.scope).toEqual(secondScope);
  });
});
