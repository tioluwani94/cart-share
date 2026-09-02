# 003 — Make shop item swipe actions reliable and physical

- **Status**: IMPLEMENTED — DEVICE FEEL CHECK PENDING
- **Severity**: HIGH
- **Category**: Direct manipulation, feedback, accessibility, cohesion
- **Estimated scope**: 5–7 files, approximately 180–260 lines changed

## Problem

The Shop tab renders the shared `ListItem` with Delete but omits `onEdit`, even
though the row always reveals an Edit action. `ListItem` optional-chains the
missing callback, so tapping Edit closes the row and produces a haptic without
opening the existing `EditItemSheet`. The editor remains wired on the list
detail route, making this an integration regression rather than a removed
feature.

The swipe itself derives every gesture update from the mutable animated
position. Crossing the halfway point therefore changes the calculation base
mid-gesture and can jump the row fully open or closed. Deletion also begins a
terminal exit animation before its asynchronous operation succeeds, which can
leave a mounted row invisible when the mutation rejects.

## Target

- Wire the existing `EditItemSheet` into the Shop tab with the shared offline
  `updateItem` and `removeItem` actions.
- Make visible Edit and Delete callbacks required by `ListItem`, so a dead
  action cannot compile in a future call site.
- Capture the row position at gesture start and track the finger 1:1. Apply
  gentle resistance only beyond the fully revealed boundary.
- Project the release position using velocity and settle to open or closed with
  a **260ms**, critically damped, overshoot-clamped spring.
- Under Reduce Motion, retain direct finger tracking but resolve the release
  immediately without a spring.
- Await Delete before treating the row as removed. On failure, keep the row
  visible and open, show the shared error toast, and allow retry.
- Permit only one revealed row at a time and close it when its list begins
  scrolling.
- Use the app's semantic neutral and error colours for the actions, with
  restrained **100–140ms** press feedback. The actions remain opaque rather
  than glass because they are controls beneath a directly manipulated surface.

## Repo conventions to follow

- Reuse `components/lists/EditItemSheet.tsx`; do not create a second editor.
- Use `useShoppingList` actions so online, offline, optimistic, and queued
  operations remain consistent.
- Use `useToast` for recoverable mutation failures.
- Use `themeColors` rather than raw Tailwind red or arbitrary hex values.
- Keep static layout in NativeWind and motion on Reanimated's UI runtime.
- Do not add dependencies.

## Steps

1. Extract and test pure swipe-position and release-settling calculations.
2. Refactor `ListItem` to use a captured gesture start, boundary resistance,
   projected settling, Reduce Motion, and semantic action presentation.
3. Require Edit/Delete callbacks, await deletion, and restore the open row with
   a toast when deletion fails.
4. Add controlled open-row props and connect them to both Shop and list-detail
   list renderers. Close the active row on scroll.
5. Wire `EditItemSheet` into the Shop tab with `updateItem` and `removeItem`.
6. Add focused regression coverage for edit invocation, deletion rejection,
   and swipe math.

## Boundaries

- Do NOT change item mutations, the Convex schema, offline queue semantics, or
  list routing.
- Do NOT add a destructive confirmation dialog; revealing and pressing Delete
  is already a deliberate two-step interaction.
- Do NOT add looping, decorative, elastic, or glass action-button motion.
- Do NOT remove long-press Edit or accessibility custom actions.

## Verification

- **Mechanical**:
  - Run the focused ListItem/swipe tests.
  - Run `npm run typecheck`; expect exit code 0.
  - Run `npm run lint`; expect exit code 0.
- **Feel check**:
  - Slowly drag through the midpoint in both directions; the row must remain
    attached to the finger with no jump.
  - Flick left and right at different distances; settling must follow momentum
    and never bounce.
  - Reveal a second row and begin scrolling; the previous action tray must
    close.
  - Tap Edit on the Shop tab; the existing editor must open with the selected
    item's values.
  - Simulate a deletion rejection; the row must remain visible and actionable
    while an error toast explains the failure.
  - Enable Reduce Motion; dragging must remain direct and release must resolve
    without an animated spring.
- **Done when**: Edit works on every visible row, Delete cannot produce an
  invisible stale row, swipe motion is continuous and interruptible, only one
  tray remains open, accessibility actions match the visual actions, and all
  checks pass.

## Implementation verification

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Focused swipe and action tests — 7 passed.
- Full Jest suite — 76 suites and 302 tests passed.
- The updated Shop screen renders without a runtime or layout error in the
  iPhone 17 Pro simulator. Computer-driven drag input was interpreted by the
  simulator as taps, so final gesture pacing remains a manual device UAT item.
