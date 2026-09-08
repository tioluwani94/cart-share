# Plan Quick check — local UAT

Implemented 8 September 2026. No new navigation or prototype-only household banner.

Release follow-up: commit `59734c1` was pushed on 8 September. The approved
Quick Check backend, including Undo, is now deployed to production
`tangible-mink-681` and to `savory-woodpecker-17`, which is shared by EAS
development and preview. Build `1.0.0 (7)` compiled and uploaded successfully
on 8 September. Apple processing is complete, the internal Team (Expo) group
is assigned with one invitation, and build-specific test notes are saved.
Installation/UAT of build 7 and external review remain pending.
Earlier "no production deployment" entries below record
the state of those individual local-UAT sessions, not the current deployment.
The remaining physical-device interaction checks are not inferred complete
from deployment or automated tests.

## Behaviour

- View list → Shop tab; Choose a few regulars → Pantry tab.
- Right swipe / Need this → existing add decision. Left / Still have it → existing cadence adjustment and review delay; never delete an existing Shop item.
- Not sure → existing `not_this_time` delay (next planned shop + one day, or one day from now if unplanned).
- Session progress keeps a fixed denominator. Products resolved by another member leave the current queue; newly due suggestions start a fresh check on request.
- The prototype-style compact Next shop card replaces the tall legacy card and Saturday-only shortcut. Tap its edit action for a calendar, household-local time and shopping mode, saved together. Its title opens Shop. Budget/planned spend, next-list selection, other lists, creation and `/restock-review` remain available.
- Empty states distinguish completed, nothing due, no tracked products, learning-only and all-paused. Product artwork comes from the existing local catalogue with its fallback.

## Undo safety / deployment

The additive `restockUndoRecords` schema stores a server-owned comparison receipt, previous reminder fields, the creating user, and only the ID/snapshot of an item this decision actually created. It expires after five minutes and is deleted by a scheduled internal mutation. Account/household deletion also clears receipts.

Undo requires the original authenticated household member, a live receipt, unchanged product data, the same active non-archived shop, and (if applicable) the same untouched, uncompleted created item. A failed check makes no changes. Existing items are not deleted. The original operation ID remains remembered so a late duplicate cannot reapply the decision.

Offline choices use the existing scoped queue and disclose that Undo is unavailable. An online receipt can be undone after reconnecting while it remains valid. Deploy the schema/functions before shipping the new client; older clients remain compatible because Undo is opt-in.

Successful Undo receipts retain a short-lived acknowledgement until expiry, so retrying after a lost response returns success without applying the reversal twice.

Development deployment: `dev:savory-woodpecker-17`. Production has not been deployed for this feature.

## Device checklist (pending physical-device UAT)

- Review three products using a long drag, short flick, cancelled drag and each button; confirm only one decision is saved per action.
- Reverse or interrupt a drag, and scroll vertically from the card. There should be no jump or scroll capture.
- Check the lowest buttons at small screen size and large text; all must remain reachable above the tab-bar inset.
- Turn on Reduce Motion and VoiceOver; confirm buttons, product name, progress and result/error copy remain usable.
- Add → Undo: only the item just created disappears and reminder timing is restored. Still have / Not sure → Undo restores timing.
- Have a second household member edit or purchase that item, change the product cadence, or switch/finish the Next shop before Undo. Confirm refusal without overwriting their work.
- Disconnect before a choice, reconnect, and confirm one replay with no duplicate. Disconnect before Undo: it must require reconnection, not silently queue reversal.
- Force a save failure: the same card remains for retry. Change tabs during a save; no stale session should advance on return.
- Verify all five empty states and the requested tab destinations. No products due is not the same as no products tracked.
- Edit Next shop: select another month/day, enter a future time, change shopping mode, Save and reopen. Verify Cancel leaves the saved plan unchanged; invalid/past times and offline saves are blocked. Test the lowest field with the keyboard open and dismiss with Done, scrolling and an outside tap.
- Scroll in both directions on each tab. The selected pill and all four icons should stay centred through the expanded/compact transition. Check with larger text and Reduce Motion too.

No EAS build or production release is part of this change. Automated tests and bundling do not substitute for physical-device motion UAT.

## Compact Next shop follow-up — 8 September 2026

- Replaced the retained legacy card with the approved compact date tile / list summary and date-time-mode editor. No schema or dependency changes were needed.
- Fixed four-tab collapse geometry: the icons no longer use the old edge-only three-tab offset; pill and icon centres use the same clamped segment calculation.
- All 91 suites / 428 tests passed; TypeScript and targeted ESLint passed. The full Jest runner reported lingering handles after completion and was stopped manually.
- Local iPhone 13 Release build succeeded (zero errors, one build-script warning), installed and launched. The compact card and calendar editor were visually verified through iPhone Mirroring. Pantry was scrolled to compact mode and its icon was centred in the selection pill; returned to Plan afterward.
- Time-field focus, Return and editor dismissal were checked without changing the saved plan. Mirroring used the Mac keyboard, so physical on-screen-keyboard avoidance, large text and save/reopen still require user UAT.

## Prototype fidelity follow-up — 8 September 2026

- Schedule is now one white compact strip (14pt padding / 18pt corners), with no duplicate eyebrow or separate grey metadata footer. Actual date/time, count, mode and optional amount remain visible; the coral calendar action retains the existing editor.
- Added the standalone warm-neutral View list button immediately below, routing to Shop. Other plans now has a count, compact white rows and the prototype-sized warm-neutral New list button. Zero secondary lists still shows the section, without sample household data.
- TypeScript, application-file ESLint and diff checks passed. Four focused suites / 27 tests passed (schedule editing, card/row destinations, offline creation, Quick check and tab geometry). Existing test-mock lint warnings remain; no application lint errors.
- Rebuilt locally and installed on the iPhone 13: zero build errors, one existing Hermes script warning. Screenshot verification confirms the single-row schedule, View list, Other plans / 0 lists and neutral New list treatment. No EAS or production deployment.
- Interactive scroll verification is pending: iPhone Mirroring returned `noWindowsAvailable` for scroll actions although screenshots remained available. On-device UAT should scroll New list clear of the floating tabs, open it, and verify populated Other plans rows (the current household has none). No household data was created or changed for this check.

## Other lists and Pantry filter follow-up — 8 September 2026

- Latest feedback supersedes the zero-count section above: show **Other lists** only when secondary lists exist. Keep New list available even when there are none. Verified the empty section is gone on iPhone 13.
- Paused now shows its total household count, including zero, matching Learning; counts are independent of the search text.
- Reproduced Pantry's blank CTA on the physical iPhone by returning to an empty Learning filter. The action props remained supplied; native glass rendered the action transparent after the list transition. Changed only the shared empty-state button's material to `forceSolid`, preserving the card animation, filter logic and callback. Replayed Learning → Show all shelves → Learning and Paused → Show all shelves → Paused on-device: the coral action remained visible and functional.
- Added a regression test for the solid material boundary and action callback across repeated empty/populated remounts, alongside the existing card tests. Jest does not emulate native glass compositing; the iPhone replay is the visual verification. Seven focused suites / 32 tests, TypeScript, targeted ESLint and diff checks passed.
- Local Release build installed successfully (zero errors, one existing Hermes warning). No EAS build, production deployment or household data edits.

## Schedule action simplification — 8 September 2026

- Removed the standalone View list / item-count button beneath the schedule card. The card is scheduling-only: its calendar control still opens the date/time/mode editor, and its summary does not navigate to Shop. The empty-state View list action and New list remain unchanged.
- Updated the component regression test and design rules. Subsequently rebuilt onto the iPhone at the user's request.

## Plan, tabs and Pantry polish — 8 September 2026

- Tab labels now use Nunito ExtraBold. The active schedule edit control uses Pencil; its scheduling-only behavior is unchanged.
- Quiet Plan renders no placeholder card or its wrapper spacing. Completed-check feedback and Undo, first-use/learning/paused guidance and errors remain supported.
- Secondary list headers now show Archive directly. Verified one tap opens the existing confirmation, then cancelled with Keep list; no list was archived.
- Reproduced Learning → All shelves preserving the “Your extras” shelf near the bottom. FlashList's default visible-content anchoring was retaining that shared shelf. Disabled anchoring on Pantry and reset the absolute scroll origin on filter actions and after their layout commit (`skipFirstItemOffset` keeps the header in view). Ordinary product updates do not trigger this reset.
- Verified Learning → All shelves and Paused → Show all shelves return to the full Pantry title/search/filters and first Breakfast shelf on iPhone 13. Added a reset lifecycle regression test and quiet-card omission test. Four focused suites / 22 tests, TypeScript, targeted ESLint and diff checks passed.
- Local Release installed successfully (zero errors; existing Hermes script warning). No EAS build, production deployment or household data edits.

## Card navigation, budget setup and Pantry typing — 8 September 2026

- Updated the earlier scheduling-only decision: tapping the compact active-list card now navigates to Shop. The pencil remains a separate sibling target that opens the existing schedule sheet; no duplicate View list button.
- Spending offers an opaque white Set monthly budget card when the budget is undefined, with or without recorded trips. A zero budget is considered configured. The CTA opens the existing Settings budget sheet and consumes its entry request, preserving shared validation/save/error handling and avoiding reopening on live data updates.
- Pantry search no longer echoes list-state text into a controlled native input. The native field owns text/selection; text changes still update filtering, and both clear × and Show all shelves clear the native field and query together. This removes a likely fast-typing reconciliation source; hardware/software-keyboard caret behaviour still needs physical UAT.
- Six focused suites / 30 tests passed, including independent card actions, budget presence, deferred household loading into the editor, rapid text updates, mid-text edits and explicit clearing. Typecheck and targeted production-code ESLint passed (existing test-fixture warnings remain in the schedule suite).
- Physical UAT checklist: tap the card body then Edit independently; type quickly, insert in the middle, paste, erase and clear on Pantry; use Show all shelves after a no-result search; verify budget setup appears only for an unconfigured household, opens the shared editor, saves, and is absent when returning to Spending.
- Local Release build succeeded and installed on iPhone 13 (Complete 100%, zero errors, existing Hermes warning). iPhone Mirroring reported iPhone in Use, so this tranche's physical interaction checks remain pending. No EAS build, production deployment, commit or household data edits.

## Visible card stack — 8 September 2026

- Removed only the standalone View list action beneath an active Quick check stack. Completion-state navigation remains available.
- Root cause: uniformly scaling tall background cards shortened their height around the centre and cancelled their negative top translation. Their bounds also included the swipe hints. Replaced this with a dedicated card-only stack: fixed 10pt upward offsets, horizontal insets, reserved top space and opaque warm surfaces. No vertical scaling; decorative layers ignore touches and assistive technology.
- Three focused suites / 18 tests, typecheck, targeted ESLint and diff checks passed. Regression coverage includes 1–4 remaining products, shrinking queues, 340/520/720pt card heights, and completion navigation without an active-stack View list button.
- At the user's request, made exactly three additional existing products due in development deployment `savory-woodpecker-17`, in the household with active list Weekly Groceries. Set Bananas, Bread and Eggs to 1-day cadence using the existing authenticated updateProduct mutation. Original cadences for restoration after UAT: Bananas 7 days, Bread 7 days, Eggs 14 days. No purchases, extra products or shopping-list items were invented. Query verified four unadded candidates: Bananas, Bread, Eggs, Wipes.
- Local Release build installed on iPhone 13 (zero errors, existing Hermes warning). Opened the fresh build and visually verified two clearly exposed back-card edges above Bananas and no View list action beneath the swipe hints. Left all four candidates unchecked for user UAT. No EAS build or production changes.
