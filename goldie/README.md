# OurPantry App Store assets

Apple App Store only. Goldie 0.3.1 supplies the CLI and bundled Argent driver;
no mobile-app dependencies were added. Run every command from the app repo root.

## Capture gate — verified 8 September 2026

Do not publish or upload captures until all of these are verified:

- The local **Release** simulator build uses development, not production.
- It is signed into the owner-approved demo account, with the fictional
  **The Parkers** household and sample groceries/spending.
- The owner completed the development Clerk profile update; the app now shows
  **Alex Parker** with a generic avatar and no personal profile photo.
  CartStart was the old application name; the approved rename to OurPantry is saved.
  Do not change any production user, login email or authentication credentials.
- Reinstalling the app retains the intended login, or the owner signs back into
  the demo account. Goldie reinstalls the app: an already signed-in simulator is
  not proof that automated capture will stay signed in. Never add an auth bypass.
- The sample household still has three due regulars, eight Shop items (two
  checked), and the sample spending data. Flows assert visible fixture content
  and deliberately do not consume Quick Check decisions.

The sample dates are September 2026. For a later run, ask the owner before
refreshing the development fixtures, then update date-sensitive selectors if
needed. Never seed or reset production for marketing captures.

## Pipeline

The configuration discovers the newest OurPantry Release simulator artifact
under Xcode DerivedData. Verify the printed path before capture; build Release
locally with the repository's iOS workflow if it is absent or stale.

```sh
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 doctor
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 capture
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 frame
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 manifest
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 studio --no-open
```

Run video rendering separately, then refresh the studio at localhost:4321:

```sh
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 preview
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 manifest
GOLDIE_CONFIG="$PWD/goldie/goldie.config.ts" npx -y goldie@0 verify
```

Review every image and clip visually for private data, clipping, transient
loading indicators, copy legibility and correct screen content. Verification
checks output format; it does not guarantee Apple acceptance or ASO performance.

## Intended output

- Four 1320×2868, opaque PNGs: shared Shop, Quick Check, Pantry, Spending.
- One plain native 15–30-second preview: Plan → Shop → Pantry. No captions,
  simulated interaction, device framing or recording watermark in the video.
- Generated output is ignored under `goldie/out/`.
- Store ratings in the studio are explicitly unrated placeholders. The 4+ label
  is not evidence of a completed App Store Connect age-rating questionnaire.
- The owner confirmed iPhone-only support. Expo and native iOS now exclude
  native iPad support. Build 7 predates this correction: a replacement binary
  with `UIDeviceFamily = [1]` must be verified and selected before review.
  iPad captures are no longer planned. iOS may still offer iPhone compatibility
  mode on iPad; this is not a separate tablet UI or a fabricated hardware restriction.

## Validation — 8 September 2026

Goldie's doctor passes every check. Capture completed all four screenshots and
three preview segments on iPhone 17 Pro Max, with authentication retained across
reinstallation. The fictional household and anonymous avatar were visually
verified. One capture failed with an Argent ViewInspector timeout; the retry
completed successfully without changing the app or authentication.

Four framed 1320×2868 PNGs were rendered and visually checked. Goldie's initial
29.4-second preview passed format checks but contained startup and recorder
idle frames. The final 17-second edit removes those portions without adding
simulated UI, framing or captions. Goldie verifies H.264, 886×1920, 30 fps,
AAC at 48 kHz, and the permitted duration/file size. Raw recordings remain intact.
No assets have been uploaded to Apple yet. Review the assets in the studio at
**http://localhost:4322** (4321 is occupied by the landing page).

For this capture only, the final edit uses the following real-recording ranges:
`preview-check.mp4` 5.5–10.5 s, `preview-shop.mp4` 1.5–7 s, and
`preview-pantry.mp4` 1–7.5 s. These ranges must be reviewed again after any
recapture; do not apply them blindly. Running `goldie preview` replaces this edit
with the full raw assembly. Re-run `manifest` and `verify` after editing.

Goldie's doctor flagged Argent's global `video-watermark` setting. It was disabled
for this approved workflow; this changes recorder decoration, not the app. The
setting can be restored afterwards with `argent enable video-watermark`.
