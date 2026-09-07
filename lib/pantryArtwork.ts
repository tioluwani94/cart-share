// Approved generic catalogue artwork. Local assets only; no product identity is inferred.
export const pantryArtwork = {
  milk: {
    source: require("@/assets/pantry/milk.webp"),
    size: 122.81,
    bottom: 3.4,
  },
  eggs: {
    source: require("@/assets/pantry/eggs.webp"),
    size: 114.75,
    bottom: -1.88,
  },
  bread: {
    source: require("@/assets/pantry/bread.webp"),
    size: 116.95,
    bottom: -14.01,
  },
  "oat-milk": {
    source: require("@/assets/pantry/oat-milk.webp"),
    size: 126.62,
    bottom: 0.53,
  },
  rice: {
    source: require("@/assets/pantry/rice.webp"),
    size: 127.76,
    bottom: -0.05,
  },
  pasta: {
    source: require("@/assets/pantry/pasta.webp"),
    size: 130.58,
    bottom: -0.43,
  },
  oil: {
    source: require("@/assets/pantry/oil.webp"),
    size: 132.14,
    bottom: -4.96,
  },
  egusi: {
    source: require("@/assets/pantry/egusi.webp"),
    size: 114.75,
    bottom: -8.74,
  },
  chicken: {
    source: require("@/assets/pantry/chicken.webp"),
    size: 108.46,
    bottom: -6.44,
  },
  salmon: {
    source: require("@/assets/pantry/salmon.webp"),
    size: 106.83,
    bottom: -16.02,
  },
  apple: {
    source: require("@/assets/pantry/apple.webp"),
    size: 128.02,
    bottom: -5.98,
  },
  banana: {
    source: require("@/assets/pantry/banana.webp"),
    size: 122.18,
    bottom: -10.42,
  },
  orange: {
    source: require("@/assets/pantry/orange.webp"),
    size: 136.61,
    bottom: -9.76,
  },
  grapes: {
    source: require("@/assets/pantry/grapes.webp"),
    size: 121.71,
    bottom: -8.79,
  },
  tomato: {
    source: require("@/assets/pantry/tomato.webp"),
    size: 131.18,
    bottom: -1.94,
  },
  carrot: {
    source: require("@/assets/pantry/carrot.webp"),
    size: 111.66,
    bottom: -3.66,
  },
  broccoli: {
    source: require("@/assets/pantry/broccoli.webp"),
    size: 128.93,
    bottom: -4.65,
  },
  pepper: {
    source: require("@/assets/pantry/pepper.webp"),
    size: 146.41,
    bottom: -10.22,
  },
  onion: {
    source: require("@/assets/pantry/onion.webp"),
    size: 126.97,
    bottom: 0.3,
  },
  fallback: {
    source: require("@/assets/pantry/fallback.webp"),
    size: 141.32,
    bottom: -5.98,
  },
} as const;
export type PantryArtworkId = keyof typeof pantryArtwork;
