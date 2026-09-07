# Pantry shelf explorations

Isolated, mobile-first prototype. No production screen imports this code. No
Convex, Clerk, analytics, real household reads/writes, remote runtime API calls,
or new npm dependencies. Do not include this folder in a production website.

Run from this directory: `node server.mjs`. Open `http://localhost:8788` on the
Mac, or `http://<Mac LAN address>:8788` on the iPhone (same network).
This server exposes only this prototype directory; stop it when review ends.

The mobile-web surface is for comparing designs on the physical device, not a
native Expo implementation. Promote only the user's selected design to React
Native after review; remove this prototype unless the user asks to keep it.

## Directions

### Selected design: Aisle — final design UAT

Open `/aisle.html` for the revised, picker-free review. The user selected Aisle;
the layout and catalogue images are approved. Native integration now lives in
`app/(tabs)/pantry.tsx` and `components/pantry/`. The original explorations below
remain historical design-review evidence, not the native implementation.

The approved images are rendered 20% smaller than the first catalogue preview,
with bounded silhouettes inside each shelf arch. The same optical sizing is
used in `/catalogue.html` and the native artwork registry. Native unit tests
verify the visible alpha bounds of all 20 images against the shelf space.

- Keep Breakfast, Cupboard, Fruit & veg, and Fresh favourites categorization.
- Remove numbered shelf labels and the redundant header Shop shortcut.
- Put search below the Pantry title/subtitle, above status filters, in scrolling
  content. Retain the existing profile/settings header action and global tabs.
- Collapse the large title into a centered compact title on scroll; search
  scrolls away rather than becoming another permanent navigation control.
- The Shop tab opens the local demo shopping list. Plan and Spending remain
  non-interactive navigation context, not replacement app routes.

The revised page's search/filter, product sheet, and add-to-Shop interactions
were checked in the browser; no browser errors were recorded. The five data
tests and JavaScript syntax check passed during prototype review. Native
integration was implemented after that review.

| Variant | Exploration | Benefit | Cost |
| --- | --- | --- | --- |
| Oak | Physical, built-in cupboard | Strongest familiar pantry metaphor | More vertical space |
| Rail | Dense, minimal floating shelves | Fastest overview | Smaller product photography |
| Aisle | Horizontal category browsing | Room for larger, recognisable photos | Some products need a swipe |
| Nest | Expandable category drawers | Handles larger collections cleanly | An extra tap to see products |
| Focus | One category at a time | Calm, generous touch targets | Slowest whole-pantry scan |

## Interactions

- Tap the dark picker, or use 1–5 / arrow keys. R replays the preview motion.
- `?v=1` through `?v=5` survives reload; invalid values fall back to Oak.
- Search and filter Learning/Paused; open any product; add/remove it from the
  demo shopping list; change cadence; pause/resume/start tracking.
- Track something else adds the demo red onions. Header basket shows the list.
- Aisle supports horizontal scrolling and next-shelf buttons. Nest expands
  categories. Focus supports category tabs, dots, arrows, and horizontal swipes.
- State is shared across variants during the session and resets on reload.
- App navigation labels are non-interactive context, not replacement routes.

## Asset provenance

### Generated catalogue sample — image UAT

Open `/catalogue.html` to review 20 newly generated assets on Aisle shelves or
in an all-images grid. This is separate from the original five-variant picker.

- Breakfast: milk, eggs, bread, oat milk.
- Cupboard: rice, pasta, cooking oil, egusi.
- Fruit & veg: apples, bananas, oranges, grapes, tomatoes, carrots, broccoli,
  peppers, onions.
- Fresh favourites: chicken, salmon.
- Unknown products: one neutral ivory storage container.

These are generic, unbranded illustrations, not exact packaging or quantities.
Each was generated separately with the built-in image-generation tool. Prompts,
subjects and original PNG source paths are recorded in `catalogue-source.json`.
`prepare-catalogue.mjs` produces alpha-preserving 512 px WebP previews in
`assets/catalogue/` and display-bound metadata in `catalogue-assets.js`. Original
PNGs remain unchanged. The 20 previews total approximately 856 KB on disk.

The matching demo uses conservative exact aliases after case/space normalization.
Unknown names always use the fallback; dairy and oat milk remain distinct.
This is not a production matcher. MVP catalogue matching must preserve the
user's product name and household product identity/history, and must never
block adding an item. No runtime image generation is planned for MVP. Future
AI classification/generation is deferred until usage justifies it.

All 20 images loaded in browser review; matching and fallback were checked at
phone width. Existing five prototype tests and catalogue syntax checks pass.
No production app changes, native builds, EAS builds or deployments were made.

### Original exploration assets

Product photographs are the grocery sample assets provided by
[DummyJSON](https://dummyjson.com/docs/products), downloaded from its
`https://cdn.dummyjson.com/product-images/groceries/<id>/1.webp` endpoints on
7 September 2026. Filenames retain the original IDs. They are bundled so the
prototype does not depend on a CDN while browsing. These are **evaluation
assets**, not a cleared production product catalogue. Confirm appropriate
image rights/sourcing before shipping the selected design.

Nunito Black and ExtraBold are copied from the app's installed
`@expo-google-fonts/nunito` package. Palette and type follow `DESIGN.md`.
The picker retains the Emil prototype skill's exact independent chrome.

The pantry represents tracked purchasing rhythms, **not quantities on hand**.
Learning items do not become active reminders without explicit action.

## Verification — 7 September 2026

- Five pure-data tests pass: assets, status/search, category growth, URL parsing,
  and escaping (`node --test verify.mjs`). All browser JS syntax checks pass.
- App `pnpm typecheck` passes. No production app files have changed.
- All five variants rendered at 390×844. Open/add/remove product actions passed
  in each; every rendered image loaded; browser error/warning log was empty.
- Cadence changes, pause/resume, learning opt-in, unmatched search/recovery,
  adding a thirteenth product, drawer expansion, category selection, horizontal
  shelf paging, number-key selection, and URL reload persistence checked.
- At 320 px the picker and page remain within viewport bounds. The drawer
  direction is labelled **Nest** to fit the unmodified picker chrome.
- The physical iPhone 13 opened the local page in Safari. This is not a native
  build or an EAS build. Device UAT and selection are still for the user.
- Reduced Motion removes CSS transitions/animations, image presses and animated
  scrolling; replay also observes that preference. The shared mobile-web sheet
  is opaque and keyboard/search can be dismissed with Return or outside taps.
