import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import type { Id } from "@/convex/_generated/dataModel";
import { useShoppingList } from "./useShoppingList";
import { OfflineQueueProvider } from "./useScopedOfflineQueue";
import { storage } from "./storage";
import type { ItemWithUser } from "./useCachedQuery";

let mockOnline = true;
let mockServerItems: ItemWithUser[] = [];
const mockComplete = jest.fn(async () => ({}));
const mockDirectToggle = jest.fn();
const mockAdd = jest.fn();
const mockSetCompleted = jest.fn();
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
      toggle: mockDirectToggle,
      complete: mockComplete,
    })[name] ?? mockNoop,
}));
jest.mock("./useNetworkStatus", () => ({
  useIsOnline: () => mockOnline,
  useNetworkStatus: () => ({ isConnected: mockOnline }),
}));
jest.mock("./SyncStatusContext", () => ({ useSyncStatusSafe: () => null }));
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
  act(() => {
    tree = TestRenderer.create(<Screen />);
  });
});
afterEach(() => act(() => tree.unmount()));

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
  await act(async () => {
    await current.retrySync();
  });
  expect(current.queueLength).toBe(0);
  expect(current.items?.[0].isCompleted).toBe(true);
});
