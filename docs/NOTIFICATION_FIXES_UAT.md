# Notification fixes — local UAT handoff

20 September 2026. Implementation only: no deployment, TestFlight upload, Git
push, production data export, or real notification delivery test was performed.

## Implemented behavior

- Authenticated startup and foreground refresh the installation's Expo token
  without requesting OS permission. Restoration waits for matching Clerk/Convex
  identity and preferences, checks consent again in the server mutation, and
  retires previous tokens on the same device. Restoring a device also recalculates
  reminders cancelled while it was unavailable. Opted-out accounts remain disabled.
  Both Expo token prefixes are accepted. Sign-out drains in-flight registration
  before disabling the device; stale account requests are rejected.
- Recalculation restores eligible, cancelled planning reminders in the same
  cycle only when neither a sent timestamp nor an accepted ticket exists.
  Sent/failed records remain terminal, and pending retry backoff is preserved.
- **Household activity** is a new per-person Settings opt-in, off for existing
  accounts until chosen. The existing reminder setting is unchanged. Permission
  denial offers device settings without silently enabling either category.
- Adds, edits, deletes, checks, unchecks and Quick check additions queue one
  grouped activity alert for the other member. No-op writes and duplicate
  offline adds do not queue new activity. Changes across household lists share
  one five-minute window; subsequent edits do not extend it indefinitely. A tap
  opens the most recently changed list with current data.
- Finish shop queues one completion alert per recipient/session, including
  offline completion after sync. It replaces unsent activity for that list.
  Completion taps open Spending/Recent trips, including shops with no recorded
  amount or monthly budget. Merely checking every item does not count as Finish
  shop.
- Activity respects 20:00–08:00 quiet hours in the recipient's saved time zone,
  including DST. Overnight changes consolidate until 08:00. Activity over 24
  hours old is cancelled. Restock reminders retain their selected delivery time.
- Delivery rechecks sender/recipient membership, recipient consent, list/session
  state and enabled device ownership. Generic copy includes no product names,
  prices, list names or receipt details. Activity payloads carry recipient and
  household scope, and taps from a previous account/household are discarded.
- Activity is scheduled independently from the 15-minute planning cron. An
  atomic claim prevents duplicate callbacks from submitting the same batch.
  Expo receipts retire invalid tokens. Activity favors **at-most-once
  submission**: ambiguous network failures and rate limits are not resent, so
  an alert may be missed. The row's `sent` state records the claim/submission
  attempt, not proof of device delivery; known submission failures become
  `failed`. Planning retains its existing bounded retry pipeline.

## Validation

Automated checks cover the registration lifecycle, settings consent, reminder
revival and sent-record protection, no-op/offline replay, batching across lists,
completion replacement, send-time membership/consent/token changes, private
payloads, scoped routing, and quiet-hour/DST calculations. Final test counts and
static-check evidence:

- `pnpm exec jest --runInBand --watchman=false`: **108 suites, 573 tests passed**.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with **0 errors and 18 pre-existing test warnings**.
- Changed production files: ESLint passed without warnings.
- `git diff --check`: passed.

No simulator build or physical-device UAT has been claimed. Mocked HTTP tests do
not contact Expo or send pushes.

## Internal UAT still required

Use a non-production backend and two explicitly approved test accounts/devices.
Sending a push to another person requires their test authorization; this task
did not authorize delivery tests. A backend deployment and new client build are
required before these checks can run; neither is part of this implementation.

1. Start with the current account opted into reminders. Sign out, sign back in,
   and verify that its token is enabled without another permission dialog.
   Repeat with delayed token acquisition and with a slow registration mutation.
2. Switch accounts on the same device. Confirm that the old account can no
   longer target that installation, and an opted-out new account stays disabled.
   Revoke OS permission, foreground the app, and confirm there is no prompt.
3. Confirm Household activity starts off while existing reminders remain on.
   Enable it independently on the recipient device, then disable/re-enable it
   with a batch pending. The cancelled batch must not reappear.
4. On the other member's device, add/edit/check/uncheck several items and edit
   a second list within five minutes. Expect one grouped alert to the recipient,
   none to the actor. Tap it and verify the latest changed list opens.
5. Finish a shop before its edit batch sends. Expect one completion alert and
   no pending edit alert for that list. Test both a recorded total and no total.
6. Repeat item changes and Finish shop offline, reconnect, and replay the same
   queued commands. Expect one batch/completion, never one push per replay.
7. Test foreground, background and cold-start taps. Switch account/household
   before tapping an already delivered alert; it must not open the old data.
8. Remove a member, archive/delete a list, disable the recipient's device or
   opt out before delivery. Expect cancellation. Inspect Expo tickets/receipts
   for the explicitly authorized test to distinguish acceptance from delivery.
9. Check the 20:00 and 08:00 boundaries using test timestamps/saved time zones.
   Do not change live household preferences just to run this test.
10. Make a planning reminder ineligible, then eligible again in the same cycle.
    It should return to pending. An already sent reminder must stay sent, and
    an in-progress retry must retain its backoff.

## Rollout and rollback

The additive schema contains an optional activity preference, optional reminder
routing/actor/session fields, two activity kinds, and indexes for device cleanup,
activity opt-out cancellation and planning-only cron reads. Existing rows need
no backfill. The generated API type includes the new internal module.

After UAT approval, deploy the compatible schema/functions before distributing
the updated client. Older clients continue using existing reminder APIs; enable
Household activity only on updated test clients. This does not enable activity
for existing subscribers or send historical events. External beta review may be
needed for the subsequent build.

To stop activity, switch the preference off for affected test accounts or ship a
server queue/send guard. Preserve expanded schema compatibility while activity
rows exist; do not roll back to validators that reject the new kinds or fields.
Restock functionality and its consent remain independent.
