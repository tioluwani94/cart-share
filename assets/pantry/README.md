# Pantry catalogue artwork

20 approved generic, unbranded cutouts: 19 groceries plus one neutral storage
container fallback. Generated individually with built-in image generation on
7 September 2026, then prepared as alpha-preserving 512 px WebP assets.
No third-party prototype product photographs are used by the app.

The prompt direction was realistic, restrained studio grocery cutouts, one
coherent unit, front three-quarter view, soft upper-left light, transparent
canvas, no brand marks or decorative props. Product labels are always real UI
text; illustrations never represent exact packaging, amounts or stock levels.

`lib/pantryArtwork.ts` owns optical sizes and baseline offsets. Its 20% smaller
scale addresses physical-device catalogue review: silhouettes fit within about
103 × 114 pt of a 140 × 162 pt arch, with at least 12 pt side clearance and an
8 pt baseline gap. Transparent canvas margins do not determine visible size.
`lib/pantryArtwork.test.ts` checks the actual alpha bounds of every file.

`lib/pantryCatalogue.ts` owns conservative exact aliases and display-only shelf
mapping. An unmatched name always uses `fallback.webp`. Do not infer identity,
merge products, alter history or send household names to an image service.
