import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { Id } from "@/convex/_generated/dataModel";
import { useShoppingList } from "./useShoppingList";
import { OfflineQueueProvider } from "./useScopedOfflineQueue";
import { storage } from "./storage";
import type { ItemWithUser } from "./useCachedQuery";

let mockOnline = true;
let mockSyncStatus = "idle";
let mockServerItems: ItemWithUser[] = [];
const mockComplete = jest.fn(async () => ({}));
const mockDirectToggle = jest.fn();
const mockAdd = jest.fn();
const mockSetCompleted = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockStartSyncing = jest.fn();
const mockFinishSyncing = jest.fn();
const mockNoop = jest.fn(async () => ({}));
jest.mock("@clerk/expo", () => ({ useAuth: () => ({ userId: "clerk_1" }) }));
jest.mock("@/convex/_generated/api", () => ({
  api: {
    items: {
      getByList: "items",
      add: "add",
      setCompleted: "setCompleted",
      toggleComplete: "toggle",
      remove: "remove",
      update: "update",
    },
    sessions: { create: "create", completeOffline: "complete" },
    restocks: { decide: "decide" },
    notifications: { recalculateForHousehold: "recalculate" },
  },
}));
jest.mock("convex/react", () => ({
  useQuery: (_query: string, args: unknown) =>
    args === "skip" ? undefined : mockServerItems,
  useMutation: (name: string) =>
    ({
      add: mockAdd,
      setCompleted: mockSetCompleted,
      update: mockUpdate,
      remove: mockRemove,
      toggle: mockDirectToggle,
      complete: mockComplete,
    })[name] ?? mockNoop,
}));
jest.mock("./useNetworkStatus", () => ({
  useIsOnline: () => mockOnline,
  useNetworkStatus: () => ({ isConnected: mockOnline }),
}));
jest.mock("./SyncStatusContext", () => ({
  useSyncStatusSafe: () => ({
    status: mockSyncStatus,
    startSyncing: mockStartSyncing,
    finishSyncing: mockFinishSyncing,
  }),
}));
jest.mock("react-native-mmkv", () => ({
  createMMKV: () => {
    const values = new Map<string, string>();
    const listeners = new Set<(mockKey: string) => void>();
    return {
      getString: (key: string) => values.get(key),
      set: (key: string, value: string) => {
        values.set(key, value);
        listeners.forEach((fn) => fn(key));
      },
      remove: (key: string) => {
        values.delete(key);
        listeners.forEach((fn) => fn(key));
      },
      clearAll: () => {
        const keys = [...values.keys()];
        values.clear();
        keys.forEach((key) => listeners.forEach((fn) => fn(key)));
      },
      getAllKeys: () => [...values.keys()],
      addOnValueChangedListener: (fn: (mockKey: string) => void) => {
        listeners.add(fn);
        return { remove: () => listeners.delete(fn) };
      },
    };
  },
}));

const listId = "list_1" as Id<"lists">;
const householdId = "household_1" as Id<"households">;
const scope = { clerkUserId: "clerk_1", householdId };
function item(id: string, name: string, isCompleted = false): ItemWithUser {
  return {
    _id: id as Id<"items">,
    listId,
    name,
    isCompleted,
    _creationTime: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}
let current!: ReturnType<typeof useShoppingList>;
function Consumer() {
  current = useShoppingList(listId, householdId);
  return null;
}
function Screen() {
  return (
    <OfflineQueueProvider scope={scope}>
      <Consumer />
    </OfflineQueueProvider>
  );
}
let tree: ReactTestRenderer;
async function network(online: boolean) {
  await act(async () => {
    mockOnline = online;
    tree.update(<Screen />);
  });
}
beforeEach(() => {
  storage.clearAll();
  jest.clearAllMocks();
  mockAdd.mockReset();
  mockSetCompleted.mockReset();
  mockDirectToggle.mockReset();
  mockUpdate.mockReset();
  mockRemove.mockReset();
  mockSyncStatus = "idle";
  mockStartSyncing.mockImplementation(() => { mockSyncStatus = "syncing"; });
  mockFinishSyncing.mockImplementation(({ failed }) => {
    mockSyncStatus = failed > 0 ? "error" : "synced";
  });
  mockOnline = true;
  mockServerItems = [item("rice", "Rice"), item("fish", "Fish", true)];
  mockAdd.mockImplementation(async (args) => {
    mockServerItems = [
      ...mockServerItems,
      { ...item(`server_${args.clientId}`, args.name), ...args },
    ];
  });
  mockSetCompleted.mockImplementation(async (args) => {
    mockServerItems = mockServerItems.map((item) =>
      item._id === args.itemId ||
      (args.clientId && args.clientId === item.clientId)
        ? { ...item, isCompleted: args.isCompleted }
        : item,
    );
  });
  mockUpdate.mockImplementation(async (args) => {
    mockServerItems = mockServerItems.map((item) =>
      item._id === args.itemId ? { ...item, ...args } : item,
    );
  });
  mockRemove.mockImplementation(async (args) => {
    mockServerItems = mockServerItems.filter((item) => item._id !== args.itemId);
  });
  act(() => {
    tree = TestRenderer.create(<Screen />);
  });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.useRealTimers();
});

it("recovers locally saved work after reopening while connectivity was misreported as online", async () => {
  mockAdd.mockImplementationOnce(() => new Promise(() => {}));
  await act(async () => current.addItem("Apples"));
  await act(async () => current.toggleComplete(current.items![2]._id));
  const clientId = current.items![2].clientId;
  act(() => tree.unmount());
  mockOnline = false;
  act(() => { tree = TestRenderer.create(<Screen />); });
  expect(current.items?.[2]).toMatchObject({ name: "Apples", isCompleted: true, clientId });
  expect(current.queueLength).toBe(2);
  await network(true);
  expect(current.items).toHaveLength(3);
  expect(current.items?.[2]).toMatchObject({ clientId, isCompleted: true, isPendingSync: false });
  expect(current.queueLength).toBe(0);
});

it("keeps quick online saves quiet, but announces a stalled delivery", async () => {
  jest.useFakeTimers();
  await act(async () => current.toggleComplete("rice" as Id<"items">));
  expect(current.queueLength).toBe(0);
  expect(mockStartSyncing).not.toHaveBeenCalled();
  expect(mockFinishSyncing).not.toHaveBeenCalled();

  let resume!: () => void;
  const addOnServer = mockAdd.getMockImplementation()!;
  mockAdd.mockImplementationOnce(async (args) => {
    await new Promise<void>((resolve) => { resume = resolve; });
    return addOnServer(args);
  });
  await act(async () => current.addItem("Milk"));
  act(() => { jest.advanceTimersByTime(1000); });
  expect(mockStartSyncing).toHaveBeenCalledWith(1);
  await act(async () => resume());
  expect(mockFinishSyncing).toHaveBeenCalledWith({ success: 1, failed: 0 });
});

it("keeps edits and removal responsive behind a stalled save", async () => {
  let resume!: () => void;
  const updateOnServer = mockUpdate.getMockImplementation()!;
  mockUpdate.mockImplementationOnce(async (args) => {
    await new Promise<void>((resolve) => { resume = resolve; });
    return updateOnServer(args);
  });
  await act(async () => current.updateItem("rice" as Id<"items">, { name: "Brown rice" }));
  expect(current.items?.[0].name).toBe("Brown rice");
  await act(async () => current.removeItem("fish" as Id<"items">));
  expect(current.items?.map((item) => item.name)).toEqual(["Brown rice"]);
  await act(async () => resume());
  expect(current.items?.map((item) => item.name)).toEqual(["Brown rice"]);
  expect(current.queueLength).toBe(0);
});

it("shows and persists additions while the phone reports online but the server cannot respond", async () => {
  let resume!: () => void;
  const addOnServer = mockAdd.getMockImplementation()!;
  mockAdd.mockImplementationOnce(async (args) => {
    await new Promise<void>((resolve) => { resume = resolve; });
    return addOnServer(args);
  });
  let inputReleased = false;
  await act(async () => {
    void current.addItem("Milk").then(() => { inputReleased = true; });
  });
  expect(inputReleased).toBe(true);
  expect(current.items?.map((item) => item.name)).toEqual(["Rice", "Fish", "Milk"]);
  expect(current.items?.[2].isPendingSync).toBe(true);
  expect(current.queueLength).toBe(1);

  // A second tap must work while the first request is still waiting for Wi-Fi.
  await act(async () => current.toggleComplete(current.items![2]._id));
  expect(current.items?.[2].isCompleted).toBe(true);
  await act(async () => current.toggleComplete("fish" as Id<"items">));
  expect(current.items?.[1].isCompleted).toBe(false);
  await act(async () => resume());
  expect(mockAdd).toHaveBeenCalledTimes(1);
  expect(current.items).toHaveLength(3);
  expect(current.items?.map((item) => item.isCompleted)).toEqual([false, false, true]);
  expect(current.queueLength).toBe(0);
});

it("shows check and uncheck immediately with an empty queue and an unresponsive online connection", async () => {
  let resume!: () => void;
  const setOnServer = mockSetCompleted.getMockImplementation()!;
  mockDirectToggle.mockImplementationOnce(() => new Promise(() => {}));
  mockSetCompleted.mockImplementationOnce(async (args) => {
    await new Promise<void>((resolve) => { resume = resolve; });
    return setOnServer(args);
  });
  await act(async () => { void current.toggleComplete("rice" as Id<"items">); });
  expect(current.items?.[0].isCompleted).toBe(true);
  await act(async () => current.toggleComplete("rice" as Id<"items">));
  expect(current.items?.[0].isCompleted).toBe(false);
  await act(async () => resume());
  expect(mockDirectToggle).not.toHaveBeenCalled();
  expect(mockSetCompleted.mock.calls.map(([args]) => args.isCompleted)).toEqual([true, false]);
  expect(current.queueLength).toBe(0);
  expect(current.items?.[0].isCompleted).toBe(false);
});

it("shows offline additions immediately and preserves the last check/uncheck through checkout replay", async () => {
  await network(false);
  await act(async () => current.addItem("Milk", { estimatedPricePence: 125 }));
  expect(current.items?.map((item) => item.name)).toEqual([
    "Rice",
    "Fish",
    "Milk",
  ]);
  expect(current.items?.[2].isPendingSync).toBe(true);
  expect(current.plannedTotalPence).toBe(125);
  await act(async () => {
    await current.toggleComplete("rice" as Id<"items">);
    await current.toggleComplete("fish" as Id<"items">);
  });
  const milkId = current.items![2]._id;
  await act(async () => current.toggleComplete(milkId));
  expect(current.items?.map((item) => item.isCompleted)).toEqual([
    true,
    false,
    true,
  ]);
  await act(async () => {
    await current.completeShop(current.items!);
  });
  expect(current.hasQueuedCompletion).toBe(true);
  await network(true);
  expect(mockComplete).toHaveBeenCalledWith(
    expect.objectContaining({
      listId,
      items: [
        { itemId: "rice", isCompleted: true },
        { itemId: "fish", isCompleted: false },
        { clientId: expect.any(String), isCompleted: true },
      ],
    }),
  );
  expect(mockServerItems.map((item) => item.isCompleted)).toEqual([
    true,
    false,
    true,
  ]);
  expect(current.items?.map((item) => item.isCompleted)).toEqual([
    true,
    false,
    true,
  ]);
  expect(current.items).toHaveLength(3);
  expect(current.queueLength).toBe(0);
  expect(current.items?.every((item) => !item.isPendingSync)).toBe(true);
});

it("keeps local intent over stale reconnect results and queues new edits behind an in-flight replay", async () => {
  await network(false);
  await act(async () => current.toggleComplete("rice" as Id<"items">));
  let resolveReplay!: () => void;
  mockSetCompleted.mockImplementationOnce(async (args) => {
    await new Promise<void>((resolve) => {
      resolveReplay = resolve;
    });
    mockServerItems = mockServerItems.map((item) =>
      item._id === args.itemId
        ? { ...item, isCompleted: args.isCompleted }
        : item,
    );
  });
  await network(true);
  expect(current.items?.[0].isCompleted).toBe(true);
  await act(async () => current.toggleComplete("rice" as Id<"items">));
  expect(current.items?.[0].isCompleted).toBe(false);
  expect(mockDirectToggle).not.toHaveBeenCalled();
  await act(async () => resolveReplay());
  expect(mockSetCompleted.mock.calls.map(([args]) => args.isCompleted)).toEqual(
    [true, false],
  );
  expect(current.items?.[0].isCompleted).toBe(false);
  expect(current.queueLength).toBe(0);
});

it("retains added items and edits when the list is reopened offline", async () => {
  await network(false);
  await act(async () => current.addItem("Apples"));
  await act(async () => current.toggleComplete(current.items![2]._id));
  act(() => tree.unmount());
  act(() => {
    tree = TestRenderer.create(<Screen />);
  });
  expect(current.items?.[2].name).toBe("Apples");
  expect(current.items?.[2].isCompleted).toBe(true);
  expect(current.items?.[2].isPendingSync).toBe(true);
  await network(true);
  expect(current.items).toHaveLength(3);
  expect(current.items?.[2].isCompleted).toBe(true);
});

it("keeps checked state visible after a replay failure and retries it without losing intent", async () => {
  await network(false);
  await act(async () => current.toggleComplete("rice" as Id<"items">));
  mockSetCompleted.mockRejectedValueOnce(
    new Error("Temporary connection failure"),
  );
  await network(true);
  expect(current.hasSyncError).toBe(true);
  expect(current.items?.[0].isCompleted).toBe(true);
  expect(current.queueLength).toBe(1);
  expect(mockSyncStatus).toBe("error");
  await act(async () => {
    await current.retrySync();
  });
  expect(current.queueLength).toBe(0);
  expect(mockSyncStatus).toBe("synced");
  expect(current.items?.[0].isCompleted).toBe(true);
});
