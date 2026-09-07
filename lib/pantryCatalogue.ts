import type { PantryArtworkId } from "./pantryArtwork";

export interface PantryProduct {
  _id: string;
  displayName: string;
  category?: string;
  status: "learning" | "active" | "paused";
  cadenceDays: number;
  purchaseObservationCount: number;
}

export type PantryFilter = "all" | "learning" | "paused";

/** Visual aliases only: never reuse this map to merge products or their history. */
const catalogue: { id: PantryArtworkId; shelf: string; aliases: string[] }[] = [
  {
    id: "milk",
    shelf: "Breakfast",
    aliases: ["milk", "whole milk", "semi skimmed milk", "skimmed milk"],
  },
  { id: "oat-milk", shelf: "Breakfast", aliases: ["oat milk", "oat drink"] },
  { id: "eggs", shelf: "Breakfast", aliases: ["egg", "eggs"] },
  {
    id: "bread",
    shelf: "Breakfast",
    aliases: ["bread", "sliced bread", "white bread", "brown bread"],
  },
  {
    id: "rice",
    shelf: "Cupboard",
    aliases: ["rice", "white rice", "basmati rice", "long grain rice"],
  },
  {
    id: "pasta",
    shelf: "Cupboard",
    aliases: ["pasta", "penne", "penne pasta"],
  },
  {
    id: "oil",
    shelf: "Cupboard",
    aliases: ["cooking oil", "vegetable oil", "sunflower oil"],
  },
  { id: "egusi", shelf: "Cupboard", aliases: ["egusi", "melon seeds"] },
  {
    id: "chicken",
    shelf: "Fresh favourites",
    aliases: ["chicken", "chicken breast", "chicken breasts"],
  },
  {
    id: "salmon",
    shelf: "Fresh favourites",
    aliases: ["salmon", "salmon fillet", "salmon fillets"],
  },
  { id: "apple", shelf: "Fruit & veg", aliases: ["apple", "apples"] },
  { id: "banana", shelf: "Fruit & veg", aliases: ["banana", "bananas"] },
  { id: "orange", shelf: "Fruit & veg", aliases: ["orange", "oranges"] },
  { id: "grapes", shelf: "Fruit & veg", aliases: ["grape", "grapes"] },
  { id: "tomato", shelf: "Fruit & veg", aliases: ["tomato", "tomatoes"] },
  { id: "carrot", shelf: "Fruit & veg", aliases: ["carrot", "carrots"] },
  { id: "broccoli", shelf: "Fruit & veg", aliases: ["broccoli"] },
  {
    id: "pepper",
    shelf: "Fruit & veg",
    aliases: ["pepper", "peppers", "bell pepper", "bell peppers"],
  },
  { id: "onion", shelf: "Fruit & veg", aliases: ["onion", "onions"] },
];

export const normalizePantryLabel = (label: string) =>
  label.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");

export function resolvePantryArtwork(name: string): PantryArtworkId {
  const normalized = normalizePantryLabel(name);
  return (
    catalogue.find((entry) => entry.aliases.includes(normalized))?.id ??
    "fallback"
  );
}

const categoryShelves: Record<string, string> = {
  breakfast: "Breakfast",
  dairy: "Breakfast",
  bakery: "Breakfast",
  cupboard: "Cupboard",
  pantry: "Cupboard",
  staples: "Cupboard",
  grains: "Cupboard",
  produce: "Fruit & veg",
  fruit: "Fruit & veg",
  fruits: "Fruit & veg",
  vegetables: "Fruit & veg",
  "fruit & veg": "Fruit & veg",
  "fruit and vegetables": "Fruit & veg",
  meat: "Fresh favourites",
  fish: "Fresh favourites",
  protein: "Fresh favourites",
  "fresh favourites": "Fresh favourites",
};

export function pantryShelfFor(
  product: Pick<PantryProduct, "displayName" | "category">,
): string {
  const category = product.category?.trim();
  if (category) {
    const key = normalizePantryLabel(category);
    return Object.prototype.hasOwnProperty.call(categoryShelves, key)
      ? categoryShelves[key]
      : category;
  }
  const name = normalizePantryLabel(product.displayName);
  return (
    catalogue.find((entry) => entry.aliases.includes(name))?.shelf ??
    "Your extras"
  );
}

export interface PantryShelf<T extends PantryProduct = PantryProduct> {
  key: string;
  title: string;
  products: T[];
}

export function buildPantryShelves<T extends PantryProduct>(
  products: readonly T[],
  filter: PantryFilter = "all",
  search = "",
): PantryShelf<T>[] {
  const query = normalizePantryLabel(search);
  const grouped = new Map<string, PantryShelf<T>>();
  for (const product of products) {
    if (filter !== "all" && product.status !== filter) continue;
    const title = pantryShelfFor(product);
    if (
      query &&
      !normalizePantryLabel(`${product.displayName} ${title}`).includes(query)
    )
      continue;
    const key = normalizePantryLabel(title);
    const shelf = grouped.get(key) ?? { key, title, products: [] };
    shelf.products.push(product);
    grouped.set(key, shelf);
  }
  const order = ["breakfast", "cupboard", "fruit & veg", "fresh favourites"];
  const rank = (key: string) =>
    key === "your extras" ? 99 : order.includes(key) ? order.indexOf(key) : 4;
  return [...grouped.values()].sort(
    (a, b) => rank(a.key) - rank(b.key) || a.title.localeCompare(b.title),
  );
}
