# Revamp cleanup audit

## Implementation update — 10 September 2026

The recommended removals and behavioral cleanup below are now implemented locally, including the shared finish flow for arbitrary lists. Manual acceptance is pending; use [the iPhone 13 UAT checklist](./REVAMP_CLEANUP_UAT.md). Current chrome geometry remains a profiling candidate rather than an assumed defect. No beta deployment or cleanup commit/push has been performed.

The remaining sections preserve the original audit against `92c6feb`; file locations, consumer counts, and the Block verdict describe that baseline rather than the cleaned working tree.

## Original audit

Audited commit: `92c6feb` (10 September 2026). Scope: all 19 Expo Router route files, all three layouts, production component imports/re-exports, animation implementations, notification destinations, and related tests. This is a source audit, not a new physical-device walkthrough or frame-rate profile. No application code was changed.

The main residue is unused components and intermediate success states. There are **seven component files with no production consumers**, **one household-ready state bypassed by the activation guard**, and **one older list-detail experience that is still required for other lists**. Neither of the two legacy redirect routes should be deleted.

## Findings

“After” describes the recommended cleanup, not an implemented change. P2 identifies behavioral/craft fixes; P3 identifies dead code or lower-priority refinements. Current revamp behavior is identified separately from proven old code.

| Before | After | Why |
| --- | --- | --- |
| **P2 — Household-ready state conflicts with activation.** [Household setup](/Users/tioluwanikolawole/Documents/our-pantry/app/household-setup.tsx:40) sets an invite-code success view, but [auth routing](/Users/tioluwanikolawole/Documents/our-pantry/lib/authRouting.ts:91) immediately covers and redirects a new household to `/restock-setup`. Its “Set up your plan” action even targets the tabs first. | Remove the post-create `InviteCode` branch and its copy-state handlers; make the transition into activation explicit and consistent with the guard. Keep invitation sharing in [Settings](/Users/tioluwanikolawole/Documents/our-pantry/app/settings.tsx:647). | This is not a stable step users can reliably finish. Executing the routing helper confirms the screen becomes non-renderable as soon as the new household is resolved. Keep the household-name form itself. |
| **P2 — A second shopping experience survives.** [Other lists](/Users/tioluwanikolawole/Documents/our-pantry/app/(tabs)/index.tsx:330) and [new-list creation](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/CreateListSheet.tsx:141) open `/list/[id]`. That screen has its own completion overlay, archive flow, budget editor, and composer, while Shop has its own finish sheet. | Preserve `/list/[id]` for arbitrary list IDs now. Reuse the revamped shopping presentation and finish actions when consolidating it. When creation explicitly sets the Next shop, navigate to Shop instead of the older detail presentation. | It is reachable and serves a real purpose. Shop currently binds only to `review.activeList`; redirecting every list ID there would open the wrong list. This is a consolidation candidate, not a safe file deletion. |
| **P2 — Receipt completion imposes a 2.5-second interstitial.** [Save handler](/Users/tioluwanikolawole/Documents/our-pantry/app/receipt-confirm.tsx:274) schedules navigation after rendering [SessionSaved](/Users/tioluwanikolawole/Documents/our-pantry/components/receipt-confirm/SessionSaved.tsx:20); there is no immediate continue action. Back remains available. | Go to Spending immediately with the shared success toast, or provide a user-controlled Done action. Cancel any retained pending navigation on unmount or when the user leaves. | This extra success state delays completion. The uncancelled timeout can also navigate after the user has already pressed Back. The receipt/total confirmation before saving is essential and should remain. |
| **P2 — New-list creation blocks for 1.2 seconds.** [CreateListSheet](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/CreateListSheet.tsx:25) renders `SuccessCelebration`, leaves `isCreating` true, and keeps the sheet non-dismissible until its timeout fires. | Close and open the intended list immediately after a successful mutation; use the shared toast for confirmation. Remove `SuccessCelebration` once its only caller is removed. | This is a screen-sized success state inside a sheet, rather than a separate route. It still creates a mandatory pause despite the comment describing an interruptible confirmation. |
| **P2 — Stale offline-banner timers can hide newer status.** [OfflineIndicator](/Users/tioluwanikolawole/Documents/our-pantry/components/layout/OfflineIndicator.tsx:111) has an uncancelled 300 ms hide timer and [two-second completion/reconnection timers](/Users/tioluwanikolawole/Documents/our-pantry/components/layout/OfflineIndicator.tsx:144). | Make status changes cancel pending dismissal timers and retarget the existing transition. Prefer a short fade/translation consistent with the shared toast. | Reconnect, then disconnect again before an older timeout fires: the newer offline warning can be hidden by the older callback. This is a source-proven lifecycle race; it was not reproduced on-device in this audit. |
| **P2 — Archiving leaves a delayed Back action behind.** [List detail](/Users/tioluwanikolawole/Documents/our-pantry/app/list/[id].tsx:291) waits 1.5 seconds after archiving before calling `router.back()`. | Navigate back on successful archive and show the toast on the destination. | The root toast provider survives navigation, so this dwell is unnecessary. If the user goes back manually first, the scheduled callback can pop another screen. |
| **P2 — Every item submission fades the input to 30% and back.** [AddItemInput](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/AddItemInput.tsx:76) runs a 300 ms opacity sequence, including submissions from the keyboard. | Clear the input immediately; retain the existing success haptic and functional keyboard-following motion. | This is repeated operational work. The fade adds decoration to every item added and runs for keyboard submissions as well. |
| **P2 — The active item checkbox retains celebratory motion.** [ListItem](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/ListItem.tsx:215) pulses to 1.06, delays text dimming, and [scales/rotates the tick from zero](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/ListItem.tsx:263). | Use immediate checked-state feedback or one short opacity/color transition and the existing light haptic. Keep swipe gestures. | This is still mounted in both shopping presentations, unlike the unused standalone `Checkbox`. Frequent checkoffs do not need a multi-part celebration. Reduce Motion is already handled; this finding concerns normal-mode excess. |
| **P2 — Pending offline items spin indefinitely.** [ListItem](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/ListItem.tsx:164) repeats rotation whenever `isPendingSync` is true, and the [displayed hint](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/ListItem.tsx:574) says the item is waiting to get online. | Show a static pending indicator while offline; animate only while an actual sync is running, ideally through the existing global status. | An indefinitely queued item is not active work. Multiple offline items can each run their own loop. Keep the pending-state information. |
| **P3 — Seven unused components remain.** See the deletion inventory below, including floating emoji groceries and receipt confetti. | Remove unused implementations, barrel exports, obsolete tests/mocks, and source-inspection assertions that preserve them. | No production component renders them. They are maintenance residue, not evidence that users currently see confetti. Some re-exported modules may still enter the module graph; no bundle-size saving has been measured. |
| **P3 — Joining has a 1.2-second success-only state.** [Join household](/Users/tioluwanikolawole/Documents/our-pantry/app/join-household.tsx:19) displays a passive success view before a timeout opens the notification primer. | Fold the acknowledgement into the next step, or provide an immediate Continue action. Clean up any retained timeout. | This is less frequent than shopping, so it is lower priority. The artwork and short opacity entry were already refreshed; the unnecessary part is the mandatory dwell. |
| **P3 — The new welcome artwork gates sign-in for 1.733 seconds.** [Timeline](/Users/tioluwanikolawole/Documents/our-pantry/lib/welcomeTimeline.ts:1) and [noninteractive animation branch](/Users/tioluwanikolawole/Documents/our-pantry/components/welcome/OurPantryWelcome.tsx:699) hide all actions from interaction/accessibility until the finale. | Keep the approved 3D welcome treatment; make visible sign-in actions interactive during its decorative finish. | This is current revamp behavior, not the unused old emoji component. The existing tests explicitly assert the gate, so changing it requires updating that contract. Treat this as a targeted improvement, not an instruction to discard the approved artwork. |
| **P3 — Artificial waits/progress remain.** [Receipt upload](/Users/tioluwanikolawole/Documents/our-pantry/app/receipt-confirm.tsx:176) waits 300 ms before OCR and [500 ms before starting upload](/Users/tioluwanikolawole/Documents/our-pantry/app/receipt-confirm.tsx:199); upload progress also advances randomly. Plan, Spending, and list detail simulate a 500 ms refresh. | Start real work immediately; show truthful loading/progress states. Remove fake refresh delays or tie refresh UI to a real refresh operation. | These are residual pacing choices rather than necessary screens. They delay feedback or imply work that the timer is not measuring. |
| **P3 — Some current chrome animates layout geometry.** [ProgressBar](/Users/tioluwanikolawole/Documents/our-pantry/components/ui/ProgressBar.tsx:70) animates widths; the [tab indicator](/Users/tioluwanikolawole/Documents/our-pantry/components/navigation/OurPantryTabBar.tsx:255) animates height/top/width; the [spending chart](/Users/tioluwanikolawole/Documents/our-pantry/components/analytics/SpendingChart.tsx:83) changes SVG height/y. | For routine progress, consider a clipped or translated fixed-size fill. Profile native chrome before changing its approved geometry; retain chart meaning and corner treatment. | These are current implementations, not proven legacy residue. Animated layout/SVG updates cost more than transforms, but this audit does not establish dropped frames. Do not apply browser compositor claims directly to native Reanimated. |

## Verdict

**Block the motion cleanup sign-off pending the P2 fixes.** This is a scoped design/craft verdict, not a complete production-release assessment.

- **Feel-breaking regressions:** avoidable navigation waits, a keyboard-submit flash, and checkbox scale-from-zero feedback.
- **Missed simplifications:** seven unused components, the bypassed household-ready view, passive success interstitials, and spinning offline queues.
- **Interruptibility and timing:** stale offline-banner, archive, and receipt-navigation timers can outlive the state that scheduled them.
- **Performance:** geometry animations are profiling candidates; there is no measured frame-rate regression to claim.
- **Cohesion:** preserve the new 3D language and current gesture behavior; consolidate list presentations without losing secondary-list functionality.
- **Accessibility:** most current motion has explicit reduced-motion branches or system defaults. Installed Reanimated also defaults to the system setting in [its local implementation](/Users/tioluwanikolawole/Documents/our-pantry/node_modules/react-native-reanimated/src/animation/util.ts:147). Missing an explicit `reduceMotion` property alone was not counted as a defect. JavaScript dwell timers still run independently of Reduce Motion.

## Safe deletion inventory

Production references were checked across the repository, including named imports and barrel exports. Tests and re-exports alone are not consumers.

| File | Evidence and companion cleanup |
| --- | --- |
| [AnimatedGroceryIcons.tsx](/Users/tioluwanikolawole/Documents/our-pantry/components/welcome/AnimatedGroceryIcons.tsx:1) | No production import. Old floating food emoji loops and zero-scale entrance. Current welcome uses `OurPantryWelcome` with PNG artwork. History traces this file to `0ee9ead`, the original playful welcome. |
| [ConfettiParticle.tsx](/Users/tioluwanikolawole/Documents/our-pantry/components/receipt-confirm/ConfettiParticle.tsx:1) | No production import. Old falling/spinning emoji effect, from `f5b4073`. Remove its stale mock in `__tests__/receipt-confirm.test.tsx`; keep the live receipt-state components. |
| [RestockQuickDecisionRow.tsx](/Users/tioluwanikolawole/Documents/our-pantry/components/restocks/RestockQuickDecisionRow.tsx:1) | Only its dedicated test imports it. Current Plan uses Quick check cards/stack. Remove or retire that obsolete component test along with the file. |
| [ListCard.tsx](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/ListCard.tsx:1) | Only re-exported through the lists barrel; no production consumer. Plan uses `NextShopCard` and `OtherPlansSection`. Remove the barrel export and the obsolete source-inspection assertion in `lib/secondaryScreenDesign.test.ts`. |
| [EmptyListState.tsx](/Users/tioluwanikolawole/Documents/our-pantry/components/lists/EmptyListState.tsx:1) | Only re-exported through the lists barrel. Screens now compose `EmptyStateCard` directly. Keep the shared empty-basket artwork, which is still used. |
| [Card.tsx](/Users/tioluwanikolawole/Documents/our-pantry/components/ui/Card.tsx:1) | `Card`, `CardHeader`, `CardContent`, and `CardFooter` have no production consumers beyond the UI barrel. Remove those exports with the implementation. |
| [Checkbox.tsx](/Users/tioluwanikolawole/Documents/our-pantry/components/ui/Checkbox.tsx:1) | Only re-exported through the UI barrel. Actual list rows implement their own checkbox. Removing this file alone does not remove the live checkbox animation noted above. |

`SuccessCelebration` and `InviteCode` are not in this immediate-deletion set: they have callers today and become removable only after the recommended flow changes. Neither `CompletionCelebration` nor `PartnerActivityToast` is dead; both are used by list detail.

## Route inventory

No full user-facing route was established as safely deletable without replacing functionality. Two routes are intentionally compatibility-only.

| Route | Current entry / purpose | Disposition |
| --- | --- | --- |
| `/(auth)/welcome` | Signed-out routing; OAuth/email choices | Keep current design; review action gate |
| `/(auth)/sign-in` | Welcome → email sign-in, including reviewer access | Keep |
| `/household-setup` | Signed-in user with no household | Keep form; remove competing ready state |
| `/join-household` | Household form → join by code | Keep form; simplify success dwell |
| `/restock-setup` | Household activation guard | Keep; distinct from later regulars editing |
| `/notification-setup` | Activation and joined household primer | Keep |
| `/analytics-setup` | Notification primer → optional usage consent | Keep; latest approved redesign |
| `/(tabs)` | Plan / current restock planning | Keep |
| `/(tabs)/shop` | Active Next shop | Keep |
| `/(tabs)/pantry` | Product memory, learning, paused regulars | Keep |
| `/(tabs)/analytics` | Spending history and receipt viewing | Keep |
| `/choose-regulars` | Plan and Pantry → add regulars without resetting setup | Keep |
| `/list/[id]` | Other lists and newly created lists | Keep until arbitrary-list functionality is consolidated |
| `/scan-receipt` | Shop finish or list completion → camera | Keep; permission/recovery states are necessary |
| `/receipt-confirm` | Capture or manual-total entry → receipt/session state machine | Keep route; simplify waits and terminal success state |
| `/settings` | Plan, Pantry, Spending; preferences, invitations, account actions | Keep |
| `/restock-review` | Old links/notification URL → Plan | Keep redirect |
| `/tracked-products` | Old product-learning links → Pantry, preserving focus/source | Keep redirect |
| `+not-found` | Unknown route recovery | Keep |

The backend **still emits** `ourpantry://restock-review` in [notification payloads](/Users/tioluwanikolawole/Documents/our-pantry/convex/notifications.ts:116). [Notification parsing](/Users/tioluwanikolawole/Documents/our-pantry/lib/notificationResponse.ts:29) deliberately accepts old URLs, and the tracked-products compatibility case is tested. Deleting these redirects or accepted URL formats as “obsolete screens” would risk distributed links/notifications.

## Motion retained by the revamp

- Root stack movement and immediate tab changes: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`. The auth stack is still needed for welcome/email navigation.
- Activation's 220 ms in-place step movement and 140 ms reduced-motion fallback. These are internal steps within one route, not redundant child entrances on every native push.
- Static 3D onboarding/choice/empty-state artwork; Pantry shelf rendering has no entrance cascade or autonomous floating loop.
- Quick check card drag, velocity-aware release, and static back-card stack; these communicate the decision gesture.
- Shared button/choice press feedback, segment selection, toast entry/exit, and bottom-sheet gestures/keyboard handling.
- Current collapsing headers, compact tab chrome, and shopping composer keyboard tracking. Geometry costs warrant measurement rather than deletion.
- Receipt progress ring, processing scan line, and loading dots: active-work feedback with reduced-motion handling and loop cleanup. Preserve upload/OCR failure, retry, manual entry, saving, and pre-save review states.
- Receipt viewer zoom and short chart/empty-state transitions. Settings disclosure motion remains useful; its section layout animation is current behavior, not an old screen.

## Cleanup sequence and validation

1. Remove the seven unused components and obsolete exports/mocks/assertions. Do not delete shared artwork used by live screens.
2. Fix stale timers and remove the repeated submit/checkoff/offline-pending decoration. Retain functional gestures and state feedback.
3. Remove the competing household-ready state and passive success dwell states. Preserve auth, consent, receipt confirmation, and retry behavior.
4. Align list-detail presentation/finish actions with Shop. Preserve list IDs, offline changes, budgets, secondary-list archive behavior, and completion semantics. This is a larger change than dead-file cleanup.
5. Consider welcome interaction timing and profile current chrome separately so optional polish does not expand the beta cleanup indefinitely.

Baseline verification: TypeScript passed. Ten focused Jest suites reported **54 passing tests** (auth routing, notification response, receipt flow, secondary-screen design, welcome timing, list creation, list item, item input, offline banner, receipt confirmation). Jest reported an open-handle warning and did not exit after the results; it was interrupted after the completed summary. The open handle was not attributed to a particular finding. Existing passing tests establish a baseline, not approval of the behaviors their assertions preserve.

A direct execution of `getAuthRoutingDecision` with `rootSegment: "household-setup"` changed from `{redirect: null, canRenderCurrentRoute: true}` before household creation to `{redirect: "/restock-setup", canRenderCurrentRoute: false}` with a newly created household.

Manual UAT after cleanup: new household/join, both notification and analytics choices, Next shop and other-list creation, arbitrary-list editing, rapid check/uncheck, offline queue/reconnect/disconnect, archive followed by immediate Back, receipt scan/manual/skip/failure/save, and old notification links. Check normal and Reduce Motion modes, large text, and keyboard transitions on the iPhone 13. No deployment was performed during this audit.
