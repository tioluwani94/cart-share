# OurPantry App Store assets

Apple App Store only. Goldie 0.3.1 supplies the CLI and bundled Argent driver;
no mobile-app dependencies were added. Run every command from the app repo root.

## Capture gate — not yet cleared

Do not publish or upload captures until all of these are verified:

- The local **Release** simulator build uses development, not production.
- It is signed into the owner-approved demo account, with the fictional
  **The Parkers** household and sample groceries/spending.
- Both Clerk and the app show **Alex Parker**, with no personal profile photo.
  This change is currently waiting for reliable access to OurPantry's development
  Clerk user controls. CartStart was the old name of this application, not a
  separate application; the owner-approved rename to OurPantry is saved.
  Identify the Development instance and exact demo user before editing. Do not
  change any production user, login email or authentication credentials.
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
- The app supports iPad. Separate genuine iPad captures are still required;
  these iPhone assets do not close that release gate.

## Validation — 8 September 2026

Goldie's doctor passes every check. All seven navigation flows passed on the
iPhone 17 Pro Max development simulator.
The subsequent profile check still shows Tioluwani Kolawole in The Parkers
household; the Alex Parker/no-personal-photo capture gate is not yet cleared.
The final Pantry preview segment reported a small-region idle warning despite
the expected product being present; inspect the recorded result before accepting
it. No images or video have been rendered, verified or uploaded yet.

Goldie's doctor flagged Argent's global `video-watermark` setting. It was disabled
for this approved workflow; this changes recorder decoration, not the app. The
setting can be restored afterwards with `argent enable video-watermark`.
