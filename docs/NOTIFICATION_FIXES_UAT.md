# Notification fixes — local UAT handoff

20 September 2026. The initial implementation was validated locally. The
follow-up below records the requested rebase and development UAT. No production
deployment, TestFlight upload, or production data export was performed.

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
  accounts until chosen. Onboarding now explains both categories and enables
  both after an affirmative choice and successful permission/registration;
  Not now disables both. Existing accounts are not automatically opted in, and
  Settings keeps independent switches. Permission
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

These initial checks used mocked HTTP and did not contact Expo or send pushes.

## Rebase and development UAT follow-up

- Rebased `codex/notification-fixes` onto `origin/main` at `dcc2e10`; notification
  implementation is now `21a2ed5`. No conflicts.
- After rebase: typecheck passed; **108 suites, 579 tests passed**.
- Deployed compatible functions/schema/indexes to development
  `savory-woodpecker-17`. Production `tangible-mink-681` was not changed.
- Live development API check for the approved Alex Parker / The Parkers demo
  account: activity preference enabled independently of reminders, read back,
  and restored to false. Existing reminders stayed false. No delivery was sent.
- Release simulator and signed iPhone builds succeeded using Xcode 27 with a
  local `IPHONEOS_DEPLOYMENT_TARGET=17.0` override for older Pod targets. Both
  bundles contain the development endpoint and updated notification code.
- Physical build signature verified, including development APNs entitlement.
- The initial unsigned simulator artifact could not access Keychain. Rebuilding
  with Xcode-managed simulator signing resolved startup; the welcome/sign-in UI
  is live on iPhone 17 Pro / iOS 26.5. The user signed into **Tio** and approved
  that household for live UAT instead of The Parkers.
- Live Settings check: existing shopping reminders were on and activity was off.
  Enabling activity opened the native iOS prompt, permission was granted, and
  the activity switch changed to on. Disabling it restored off while reminders
  stayed on; the live backend query confirmed both values.
- Simulator-only notification injection displayed generic copy with no item
  names or prices. A background list-activity tap opened Tio’s correct Next shop
  list. Foreground banners also displayed correctly. These were local `simctl`
  payloads, not end-to-end Expo/APNs delivery.
- Cold start retained the authenticated session, showed Plan without another
  permission prompt, and refreshed the same enabled iOS push-token row. The
  Spending empty state rendered correctly.
- **Unverified:** completion-notification taps, wrong-account/household taps,
  and a full add/check/finish shop flow. Device Hub repeatedly returned
  `noWindowsAvailable` for coordinate actions and invalid accessibility IDs
  for notification overlays. A user-assisted completion tap was requested but
  not observed. The new-list form was opened and cancelled; no list/item/shop
  records were added or changed. These cases are not recorded as passes.
- The second Tio household member had activity disabled. No pushes were sent
  to another member. Grouping, receipt delivery, offline replay, quiet hours,
  and account switching remain covered by automated tests and the manual
  checklist below, not by an end-to-end live delivery claim.
- Installed and launched the signed development build (`app.ourpantry`) on
  **Tioluwani’s iPhone — iPhone 13, iOS 26.3.1**. Both install and launch commands
  succeeded. It uses `savory-woodpecker-17`; manual acceptance is pending.

For the immediate phone pass, start with Settings (reminders and activity are
independent), then add/check/finish a clearly labeled test shop, including one
without a total. Verify Recent trips. With two approved test devices, test a
grouped list alert and a completion alert, then sign out/back in and verify
registration recovery. The simulator-only tap fixtures do not verify delivery
through Expo/APNs.

## Manual UAT still required

Use a non-production backend and two explicitly approved test accounts/devices.
Sending a push to another person requires their test authorization; this task
does not authorize pushes to other people. The development deployment and client
builds are recorded above; real delivery checks below still need two approved
test accounts/devices.

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

## Onboarding consent follow-up

The user chose to introduce both categories during activation. The shared
notification setup screen now names shopping reminders, grouped list updates,
and finished-shop alerts before the system prompt. “Turn on notifications”
enables both preferences together after permission and registration succeed;
“Not now” leaves both off. Denied/unavailable registration does not enable either
category. Settings retains separate switches, and no existing account preference
is changed by installing the update.

Focused validation: **4 suites / 45 tests passed**, covering notification setup,
Settings, restock activation, and auth routing. Typecheck and production-file
ESLint passed.

The refreshed iPhone 13 Release build succeeded, its signature verified, and
installation succeeded. The embedded bundle contains the new combined onboarding
choice and development endpoint. Automatic launch was blocked because the
iPhone was locked; unlock and open OurPantry to test. The simulator installation
still contains the earlier build, so the prior live results do not validate
this updated onboarding screen.

## Scheduled-shop reminder follow-up

The user chose **a reminder only, one hour before the shop**. Investigation
found that the old shop reminder depended on unresolved restock candidates and
a daily delivery-time window. Tio's development household had no active regulars,
no saved shop date, and no reminder rows at inspection, so there was no cancelled
Tio delivery to attribute to the reported attempt.

The corrected backend schedules each member with shopping reminders enabled,
including the person setting the date, independently of regulars. Saving a shop
and recalculating reminders now happen atomically. Each reminder is due one hour
before the explicit shop time; a shop less than an hour away becomes due now.
This timing is separate from the restock/learning daily time and quiet hours.
The existing 15-minute worker can add up to 15 minutes of delay. A shop scheduled
less than a worker interval ahead may pass before delivery; expired reminders
are cancelled rather than sent late. No immediate scheduling announcement was
added.

Delivery and retries recheck the exact active-list/date cycle, future date,
membership, per-person consent, and enabled device. Changed dates, archived or
completed shops, opt-outs, expired dates, and invalid devices cannot send stale
reminders. Copy describes the upcoming shop and its local time, with no item
names or prices. Tapping opens Shop, without a restock-review empty-state
message. Settings now distinguishes shop reminders from restock timing.

Validation: **108 suites / 592 tests passed**, plus typecheck and ESLint for
changed production files. New tests cover empty regulars, all opted-in members,
one-hour timing, short notice, rescheduling/deduplication, cancellation, retry
authorization, and the actual sender's shop-specific message using mocked HTTP.
No end-to-end Expo/APNs delivery is claimed for this follow-up.

The backend fix was deployed to development `savory-woodpecker-17`; production
was not changed. A live authenticated recalculation for Tio succeeded. Its Next
shop still had no `plannedFor`, so no real scheduled reminder was queued for
that household. The routing follow-up passed **2 suites / 17 tests** and
typecheck. End-to-end device delivery remains a manual check after saving a
real future shop date/time.

The refreshed iPhone 13 Release build succeeded, code signing verified, and
installation succeeded with the new Settings copy and Shop tap destination.

## Main integration follow-up

Rebased the notification work onto `origin/main` at `a8abfee` (native time
picker for Next-shop scheduling). The rebase had no conflicts. The combined
code passed **108 suites / 596 tests**, typecheck, and lint (**0 errors, 17
warnings**); `git diff --check` passed. These checks prepare the branch for the
user-requested fast-forward publication to main. The live delivery/manual UAT
limitations documented above remain unchanged.
