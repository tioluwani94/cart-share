import { addRegulars } from "./restocks";
import { recalculateHouseholdReminders } from "./notifications";
import type { RegularSuggestion } from "../lib/regularSuggestions";

jest.mock("./notifications", () => ({
  recalculateHouseholdReminders: jest.fn(async () => undefined),
  scheduleProductLearningNotifications: jest.fn(),
}));
const add = (
  addRegulars as unknown as {
    _handler: (
      ctx: unknown,
      args: { products: RegularSuggestion[] },
    ) => Promise<{ addedCount: number }>;
  }
)._handler;

type Row = Record<string, unknown> & { _id: string };
function fixture() {
  const household = {
    _id: "house",
    restockSetupCompletedAt: 123,
    activeListId: "chosen-list",
    peopleServed: 5,
    shoppingCadenceDays: 14,
    preferredShoppingMode: "online",
    planningTimeZone: "America/New_York",
  };
  const tables: Record<string, Row[]> = {
    users: [{ _id: "user", clerkId: "clerk" }],
    householdMembers: [{ _id: "member", userId: "user", householdId: "house" }],
    households: [household],
    householdProducts: [],
  };
  const insert = jest.fn(
    async (table: string, values: Record<string, unknown>) => {
      const _id = `${table}-${tables[table].length}`;
      tables[table].push({ _id, ...values });
      return _id;
    },
  );
  const patch = jest.fn(async (id: string, values: Record<string, unknown>) => {
    Object.assign(
      Object.values(tables)
        .flat()
        .find((row) => row._id === id)!,
      values,
    );
  });
  const ctx = {
    auth: { getUserIdentity: async () => ({ subject: "clerk" }) },
    db: {
      get: async (id: string) =>
        Object.values(tables)
          .flat()
          .find((row) => row._id === id),
      insert,
      patch,
      query: (table: string) => ({
        withIndex: (_name: string, filter: (index: unknown) => unknown) => {
          const filters: Record<string, unknown> = {};
          const index = {
            eq: (key: string, value: unknown) => {
              filters[key] = value;
              return index;
            },
          };
          filter(index);
          const matching = () =>
            tables[table].filter((row) =>
              Object.entries(filters).every(
                ([key, value]) => row[key] === value,
              ),
            );
          return {
            first: async () => matching()[0] ?? null,
            unique: async () => matching()[0] ?? null,
          };
        },
      }),
    },
  };
  return { ctx, tables, household, insert, patch };
}
const milk = { displayName: "Milk", cadenceDays: 7, category: "Dairy" };

beforeEach(() => jest.clearAllMocks());
it("adds regulars without replaying or rewriting household setup, and safely retries", async () => {
  const f = fixture();
  const before = { ...f.household };
  expect(
    await add(f.ctx, { products: [milk, { ...milk, displayName: " milk " }] }),
  ).toEqual({ addedCount: 1 });
  expect(await add(f.ctx, { products: [milk] })).toEqual({ addedCount: 0 });
  expect(f.household).toEqual(before);
  expect(f.insert).toHaveBeenCalledTimes(1);
  expect(f.insert).toHaveBeenCalledWith(
    "householdProducts",
    expect.objectContaining({
      householdId: "house",
      normalizedName: "milk",
      status: "active",
      purchaseObservationCount: 0,
    }),
  );
  expect(f.patch).not.toHaveBeenCalled();
  expect(recalculateHouseholdReminders).toHaveBeenCalledWith(f.ctx, "house");
});
it("preserves existing learning history and respects active and paused products", async () => {
  const f = fixture();
  for (const [name, status] of [
    ["Milk", "learning"],
    ["Bread", "active"],
    ["Eggs", "paused"],
  ]) {
    f.tables.householdProducts.push({
      _id: name,
      householdId: "house",
      normalizedName: name.toLowerCase(),
      status,
      cadenceDays: 18,
      lastPurchasedAt: 456,
      purchaseObservationCount: 4,
    });
  }
  expect(
    await add(f.ctx, {
      products: [
        milk,
        { ...milk, displayName: "Bread" },
        { ...milk, displayName: "Eggs" },
      ],
    }),
  ).toEqual({ addedCount: 1 });
  expect(f.patch).toHaveBeenCalledTimes(1);
  expect(f.tables.householdProducts[0]).toMatchObject({
    status: "active",
    cadenceDays: 18,
    lastPurchasedAt: 456,
    purchaseObservationCount: 4,
  });
  expect(f.tables.householdProducts[2].status).toBe("paused");
});
it("only matches products from the signed-in household", async () => {
  const f = fixture();
  f.tables.householdProducts.push({
    _id: "foreign",
    householdId: "other-house",
    normalizedName: "milk",
    status: "learning",
  });
  expect(await add(f.ctx, { products: [milk] })).toEqual({ addedCount: 1 });
  expect(f.tables.householdProducts[0].status).toBe("learning");
});
it("rejects a non-member and an unfinished household before writing", async () => {
  const f = fixture();
  f.tables.householdMembers = [];
  await expect(add(f.ctx, { products: [milk] })).rejects.toThrow("household");
  expect(f.insert).not.toHaveBeenCalled();
  const unfinished = fixture();
  delete unfinished.tables.households[0].restockSetupCompletedAt;
  await expect(add(unfinished.ctx, { products: [milk] })).rejects.toThrow(
    "setup",
  );
  expect(unfinished.insert).not.toHaveBeenCalled();
});
