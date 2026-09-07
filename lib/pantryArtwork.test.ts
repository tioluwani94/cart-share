/** @jest-environment node */
import path from "node:path";
import sharp from "sharp";
import { pantryArtwork } from "./pantryArtwork";

describe("pantry shelf image bounds", () => {
  it("bundles the 19 approved groceries and neutral fallback", () => {
    expect(Object.keys(pantryArtwork)).toHaveLength(20);
    expect(pantryArtwork.fallback).toBeDefined();
  });

  it.each(Object.entries(pantryArtwork))(
    "%s fits inside the 140 × 162 pt shelf with breathing room",
    async (id, artwork) => {
      const { data, info } = await sharp(
        path.join(process.cwd(), "assets/pantry", `${id}.webp`),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let left = info.width,
        right = 0,
        top = info.height,
        bottom = 0;
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          if (data[(y * info.width + x) * 4 + 3] > 24) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      const xOrigin = (140 - artwork.size) / 2;
      const yOrigin = 162 - artwork.bottom - artwork.size;
      expect(right).toBeGreaterThan(left);
      expect(
        xOrigin + (left / info.width) * artwork.size,
      ).toBeGreaterThanOrEqual(12);
      expect(
        xOrigin + ((right + 1) / info.width) * artwork.size,
      ).toBeLessThanOrEqual(128);
      expect(
        yOrigin + (top / info.height) * artwork.size,
      ).toBeGreaterThanOrEqual(30);
      expect(
        yOrigin + ((bottom + 1) / info.height) * artwork.size,
      ).toBeLessThanOrEqual(155);
    },
  );
});
