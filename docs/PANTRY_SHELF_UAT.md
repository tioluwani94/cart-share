# Pantry shelf implementation and UAT

## Implemented — 7 September 2026

- Approved Aisle layout promoted to the native Pantry tab, with category shelves,
  search below the title, Learning/Paused filters and the existing global tabs.
- Twenty approved, bundled catalogue illustrations; conservative exact aliases
  and a neutral fallback preserve user names and product identity/history.
- Artwork is 20% smaller than the initial catalogue preview. Optical sizing is
  contained inside a 140 × 162 pt arch rather than stretching to the tile width.
- Existing keyboard-aware product editor and reminder opt-in behavior retained.
  Shop actions use the existing shopping-list path.
- Apple Design, Emil Design Engineering and Animate Expo informed restrained
  120 ms press feedback, native scrolling and reduced-motion alternatives.

## Verification

- TypeScript and targeted ESLint passed; `git diff --check` passed.
- All 84 Jest suites / 384 tests passed with Watchman disabled. Jest reported
  lingering handles afterward and the runner was stopped manually.
- Actual alpha-bound tests verify all 20 illustrations fit the shelf space.
- The smaller catalogue preview was visually checked at phone width.
- A local iPhone 13 Release build succeeded (zero errors, one build-script
  warning) and installed. After the device was unlocked, launch succeeded and
  the native sign-in screen was visually verified through iPhone Mirroring.
- After user sign-in, the physical iPhone rendered Pantry successfully. The
  Breakfast shelf's bread and eggs fit inside their arches with headroom;
  Cupboard, search, status filters and the existing tab bar were visible. Empty
  Learning/Paused filters and recovery to All shelves were observed working.
- The three focused Pantry suites were rerun: all 36 tests passed and exited
  successfully.
- No EAS build, production deployment, commit or push was performed.

## Optional extended physical-device UAT

- Check the remaining catalogue images and longer product labels.
- Swipe category shelves and scroll vertically; confirm header/tab behavior.
- Search and clear; filter Learning/Paused; open and dismiss a product editor.
- Verify keyboard visibility/dismissal and Reduced Motion on device.
- Test Shop add/remove and reminder edits only with intentionally chosen items,
  since these actions change real household data.

## Follow-up fixes — 7 September 2026

- Removed the redundant “Shop for something new” footer button.
- Made the shared empty-state surface explicitly opaque white at the native
  style layer, preserving the embedded variant's transparent treatment.
- Reproduced the product-tap crash twice on iPhone 13. The device report showed
  Hermes `EXC_BAD_ACCESS` / `SIGBUS`. A one-variable press-animation probe did
  not fix it and was reverted.
- The added Shop action mounted account/offline/toast hooks inside Gorhom's
  root-hosted modal, outside their providers. Moved that controller outside the
  portal and passed the rendered action into the sheet. Provider structure,
  backend semantics and press animation remain unchanged.
- Added a regression harness that renders the action at a separate portal host,
  checks its callback, and verifies the no-active-shop editor remains available.
  Also added press-callback, native white-surface and screen-composition checks.
- Local Release build installed successfully. Bread and Eggs each opened the
  correct bottom sheet and closed without crashing; Return released field focus.
  No household products or shopping-list items were changed during these checks.
- The Learning empty state displayed its white card and no Shop footer button.
- This local build uses development Clerk and Convex. Pantry queries real
  `householdProducts` scoped to the signed-in household in that environment.
  Artwork is generic catalogue imagery; it does not create sample products or
  prove stock on hand. Development records can differ from TestFlight production.
- Typecheck passed; the complete Jest run passed 86 suites / 388 tests before the
  final screen-composition guard was added. The known lingering-handle warning
  remains in the full runner; focused tests exit normally.
