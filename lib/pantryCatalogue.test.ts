import {
  buildPantryShelves,
  pantryShelfFor,
  resolvePantryArtwork,
  type PantryProduct,
} from "./pantryCatalogue";

const product = (
  name: string,
  extra: Partial<PantryProduct> = {},
): PantryProduct => ({
  _id: name,
  displayName: name,
  status: "active",
  cadenceDays: 7,
  purchaseObservationCount: 1,
  ...extra,
});

describe("pantry catalogue presentation", () => {
  it("normalizes case/spacing and known plurals without guessing arbitrary names", () => {
    expect(resolvePantryArtwork("  OAT   Milk ")).toBe("oat-milk");
    expect(resolvePantryArtwork("milk")).toBe("milk");
    expect(resolvePantryArtwork("apples")).toBe("apple");
    expect(resolvePantryArtwork("apple juice")).toBe("fallback");
    expect(resolvePantryArtwork("milk chocolate")).toBe("fallback");
    expect(resolvePantryArtwork("__proto__")).toBe("fallback");
    expect(resolvePantryArtwork("Party bits")).toBe("fallback");
  });

  it("honours explicit categories and gives unknown products a home", () => {
    expect(pantryShelfFor(product("Eggs", { category: "Dairy" }))).toBe(
      "Breakfast",
    );
    expect(pantryShelfFor(product("Apple", { category: "Lunch boxes" }))).toBe(
      "Lunch boxes",
    );
    expect(pantryShelfFor(product("Egusi"))).toBe("Cupboard");
    expect(pantryShelfFor(product("Party bits"))).toBe("Your extras");
    expect(
      pantryShelfFor(product("Party bits", { category: "__proto__" })),
    ).toBe("__proto__");
  });

  it("never merges household identities when names share an image", () => {
    const products = [
      product("Milk"),
      product("Whole milk"),
      product("Milk", { _id: "other" }),
    ];
    const shelves = buildPantryShelves(products);
    expect(shelves.flatMap((s) => s.products)).toEqual(products);
    expect(shelves[0].products[0]).toBe(products[0]);
  });

  it("keeps learning opt-in and paused products distinct through filters/search", () => {
    const products = [
      product("Eggs", { status: "learning" }),
      product("Milk"),
      product("Apple", { status: "paused" }),
    ];
    expect(
      buildPantryShelves(products, "learning").flatMap((s) => s.products),
    ).toEqual([products[0]]);
    expect(
      buildPantryShelves(products, "paused").flatMap((s) => s.products),
    ).toEqual([products[2]]);
    expect(
      buildPantryShelves(products, "all", "breakfast")[0].products,
    ).toHaveLength(2);
    expect(buildPantryShelves(products, "all", "missing")).toEqual([]);
    expect(products[0].status).toBe("learning");
  });

  it("orders shelves, omits empty groups and supports large collections", () => {
    const products = Array.from({ length: 120 }, (_, i) =>
      product(`Product ${i}`, { category: i % 2 ? "Produce" : "Bakery" }),
    );
    const shelves = buildPantryShelves(products);
    expect(shelves.map((s) => s.title)).toEqual(["Breakfast", "Fruit & veg"]);
    expect(
      new Set(shelves.flatMap((s) => s.products.map((p) => p._id))).size,
    ).toBe(120);
    expect(buildPantryShelves([])).toEqual([]);
  });
});
