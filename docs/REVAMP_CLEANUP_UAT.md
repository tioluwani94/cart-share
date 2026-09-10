# Revamp cleanup — iPhone 13 UAT

Status: implementation and manual UAT accepted by the user on 11 September 2026; commit and push authorized. Signed Release build succeeded and was installed on the iPhone 13. This local Release build uses the existing development environment. No backend deployment is part of this cleanup. The checklist below records the UAT scope; individual boxes have not been inferred from the overall sign-off.

## What changed

- Removed seven unused components and five components made redundant by the simplified flows: household-ready invitation, list-created celebration, automatic list-completion celebration, receipt-saved interstitial, and simulated upload progress ring.
- Create/join household proceeds directly into the appropriate activation step. Invitations remain in Settings.
- Creating a Next shop opens Shop. Other shopping lists retain their own IDs, editing, budgets, and archive action, with the shared shopping summary and explicit Finish options.
- Checking an item immediately changes its tick, colour, and strike-through with a light haptic. Swipe actions remain. Queued items show a static pending indicator.
- Removed input flashes, artificial refresh waits, delayed archive/receipt navigation, and fake upload increments. Upload/OCR loading, review, failures, retry, and manual entry remain.
- Offline status owns and cancels its dismissal timers. Visible welcome buttons work after the shell appears while decorative artwork finishes.

## Acceptance checklist

Use test shopping lists so completion and archiving do not affect a real planned trip. Repeat the motion-sensitive checks with iOS Reduce Motion enabled. Check the largest text size you normally use.

### Shopping — priority check

- [ ] Create a Next shop from Plan; it opens the Shop tab immediately with the correct name and items.
- [ ] Create a separate list; it opens that list, without switching its identity to the Next shop.
- [ ] Open an existing Other list from Plan. Edit its budget, add an item, edit price/quantity/notes, and delete using swipe.
- [ ] Rapidly check/uncheck several items. The tick, strike-through, counts, and progress agree; the light haptic feels sufficient without the celebration.
- [ ] Check the last item. The list stays visible until you choose Finish, allowing corrections.
- [ ] In both Shop and another list, choose Finish → Scan receipt, Enter total, or Skip for now. The resulting trip belongs to the list you opened.
- [ ] Finish a partially purchased list; the purchased/left counts in the sheet are correct.
- [ ] Archive an Other list. It returns immediately with confirmation; pressing Back afterwards does not trigger another delayed navigation.
- [ ] Check item changes from your partner's device, then scroll far enough to recycle rows. Visible ticks still agree with item state.

### Offline recovery

- [ ] Enable airplane mode; add/check/uncheck items. Pending marks stay visible and static.
- [ ] Finish without a receipt while offline. The saved-on-device state appears; scan/manual spend options are disabled offline.
- [ ] Reconnect and verify queued changes and the trip sync once.
- [ ] Disconnect again while the “back online” or “all synced” banner is disappearing. The new offline warning remains visible.

### Receipts

- [ ] Capture a receipt. Upload starts promptly, followed by OCR and the existing total review.
- [ ] Confirm an accurate scan; Spending opens immediately with “Trip saved”.
- [ ] Correct an inaccurate total manually, select payer/store, and save. Spending shows the correct values.
- [ ] Enter a total without a photo, and separately skip financial details. Both finish the originating list correctly.
- [ ] Interrupt connectivity during upload or save. Retry/manual recovery is available and the list is not lost.
- [ ] Leave during upload/OCR. No old completion callback unexpectedly opens another screen.

### Activation and retained links

- [ ] With a test account, create a household: household name → restock setup, with no invitation interstitial.
- [ ] Join with a test invitation: join → notification primer, without a forced success pause.
- [ ] Complete both notification and analytics choices; reach Plan normally. Share an invitation from Settings.
- [ ] On welcome, tap a sign-in option once its buttons appear; it works while the final decorative artwork is still arriving.
- [ ] Existing restock-review and tracked-products links still open Plan/Pantry correctly.

## Verification and remaining scope

Initial cleanup checks: TypeScript, targeted ESLint, and all 103 Jest suites / 509 tests passed. New regressions cover the offline dismissal race, receipt completion after unmount, failed save retry, list-specific receipt destinations, immediate creation navigation, checked-state changes/recycling, and welcome interaction timing.

The baseline Jest open handle was traced to the real Clerk client imported through AnalyticsContext in the list-creation test. That test now mocks analytics, keeping the unrelated native client out of the component test.

Native tab-indicator, chart, and progress geometry was identified as a profiling candidate in the audit, not a demonstrated legacy defect. Those approved animations are retained; frame-rate profiling is not claimed by this cleanup. The user has accepted the manual UAT and authorized committing/pushing. This sign-off does not authorize a beta deployment.

## Follow-up fixes from the first device UAT

- **Clipped contributor avatar:** removed the negative right margin and prevented its wrapper from shrinking inside the clipped swipe row.
- **Invisible offline additions:** the list now subscribes to MMKV item-cache changes. Added items and pending state appear immediately, including after reopening the list offline.
- **Offline selection/checkout reconciliation:** pending absolute edits overlay reconnecting server results, new edits join the existing replay queue, enqueue is persisted before React state updates, and checkout snapshots read the latest local items. Removed the separate pending-ID cleanup that discarded temporary rows. Existing account/household scoping and server FIFO/absolute-state semantics remain.
- **Deletion sheet over welcome:** paused queries retain the mounted confirmation; deletion/sign-out dismiss before session invalidation. Sheet portals are now scoped to the account and removed when authentication changes. A definitive deletion refusal remains recoverable.
- **Invite paste:** native fields no longer truncate the clipboard payload to one character. The existing parser normalizes and limits the full code; focused characters are selected for replacement.

Repeat these checks on the updated iPhone build:

- [ ] Contributor avatar is fully visible, including with quantity, price, and pending-sync indicators.
- [ ] Offline: add an item, check one item, uncheck another, leave and reopen the list. All local changes remain visible.
- [ ] Reconnect; verify the same state remains and pending marks clear. Try another edit while earlier changes are still syncing.
- [ ] Offline: make selections and finish without receipt. Reconnect and verify the trip reflects those selections exactly once.
- [ ] Delete a disposable test account; welcome appears without the old confirmation/backdrop. Repeat with another test account. Regular sign-out also closes its sheet.
- [ ] Paste a full invitation into the first and a later code cell. The complete six-character code fills in and can be edited or submitted.

Regression coverage now includes offline cache subscription, reconnect overlays, in-flight replay ordering, offline reopen, checkout snapshots, failed replay retry, full-code paste, mounted deletion confirmation with skipped queries, and account-scoped sheet teardown. Real device/network and deletion UAT remains the acceptance check; tests use simulated services and do not delete accounts.

Follow-up verification: TypeScript and targeted ESLint pass; the full suite passes with **105 suites / 517 tests**, exiting normally. The updated iPhone build contains these fixes. The user confirmed that the fixes checked out, then reported the separate stale household membership issue documented in `ACCOUNT_DELETION_INVESTIGATION.md`. That investigation identified and repaired the missing development deletion-event subscription and the verified stale membership. Production already subscribes to deletion events; a production test-account deletion remains part of pre-beta verification.
