import { normalizeProductName } from "./productMemory";

export interface RegularSuggestion {
  displayName: string;
  cadenceDays: number;
  category?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
  lastPurchasedAt?: number;
  purchaseObservationCount?: number;
}

const starterProducts: RegularSuggestion[] = [
  { displayName: "Milk", cadenceDays: 7, category: "Dairy" },
  { displayName: "Bread", cadenceDays: 7, category: "Bakery" },
  { displayName: "Eggs", cadenceDays: 14, category: "Dairy" },
  { displayName: "Bananas", cadenceDays: 7, category: "Produce" },
  { displayName: "Pasta", cadenceDays: 30, category: "Pantry" },
  { displayName: "Toilet roll", cadenceDays: 21, category: "Household" },
];

export function getRegularSuggestions(history: readonly RegularSuggestion[]) {
  const seen = new Set<string>();
  return [...history, ...starterProducts]
    .filter((product) => {
      const name = normalizeProductName(product.displayName);
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .slice(0, 12);
}
