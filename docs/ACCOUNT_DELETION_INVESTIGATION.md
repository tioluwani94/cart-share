# Account deletion leaves stale household membership

Investigation and approved repair: 11 September 2026, following physical-device UAT. Initial inspection was read-only. After explicit user approval, the development webhook configuration and the single verified deleted account's Convex projection were repaired as recorded below. No application code or production configuration changed.

## Confirmed findings

- The recreated Brandpay-email account's join attempts failed with `This household is already full!`. Convex log request IDs: `b652200327cd8648` and `cfcf50778b770e08`.
- The affected Tio household is `j97cyd4r8c3qznrx4ha55x2az18dts82`. Its owner membership remains, plus the membership for the account reported deleted by the user.
- The stale member is Convex user `js79nqm924qn4ywtm87vbtfh9s8e4k0x`, Clerk ID `user_3J9hciW9psDKC7IfYm7e0jtBv2C`, membership `j5745zfr8cdcxjn4m3m6q4tnc58e47dp`.
- Five Convex user records currently share the reported email, with distinct Clerk IDs. This is consistent with the repeated create/delete UAT; it does not independently prove the Clerk deletion status of every record.
- The development deletion-tombstone table returns no documents. Recent logs contain successful `user.created` webhook requests, but no deletion projection or deletion webhook error in the inspected 1,000-entry history.
- The development deployment has `CLERK_WEBHOOK_SECRET` configured. Account-creation webhook success shows the endpoint is reachable and can verify at least those deliveries.

## Code path and expected behavior

Settings deletes the Clerk account and clears this device's session/cache. Convex cleanup is triggered separately by the signed `user.deleted` event at `/clerk-webhook`, which invokes `internal.users.deleteByClerkId`.

`convex/accountDeletion.ts` removes membership and personal records. When another member remains, it preserves the household and shared history and clears attribution to the deleted user. If the owner is deleted it transfers ownership. A last-member deletion removes the household through bounded cleanup batches.

`households.join` counts the persisted membership rows and limits households to two members. Consequently, the stale second row blocks the recreated identity. Recreating an account with the same email correctly creates a new identity; email equality should not transfer old memberships automatically.

## Confirmed root cause

Confirmed: Clerk-side deletion has not been reflected in the affected Convex membership. This is a server-data issue, not a stale screen or local-cache issue.

Authenticated Clerk dashboard inspection confirmed that the development endpoint subscribes only to `user.created` and `user.updated`. It omits `user.deleted`. Endpoint: `ep_38N3MQjz9j5FhHIi5FLBzS1flTd`, development instance: `ins_38KPhbJxiUqiUf2lr6JDfFV7fH5`. The endpoint targets the correct development Convex `/clerk-webhook` URL. Its displayed last update was 17 January 2026.

Clerk retained the genuine deletion event for the affected member: message `msg_3J9hmejjHMLU5v98BEpw7HipfIt`, displayed event ID `01M26Q0VXX3C744FT6V56D3QZD`, timestamp `1789079351229` (10 September 2026, 11:29 PM local). Its payload has `type: user.deleted`, `data.deleted: true`, and `data.id: user_3J9hciW9psDKC7IfYm7e0jtBv2C`. The message detail explicitly shows **zero webhook attempts**. This independently verifies the old identity was deleted and that its cleanup event never reached Convex.

The missing subscription explains both the stale membership and the subsequent household-capacity error. The failure occurs before the existing cleanup handler runs; an app rebuild alone cannot fix it.

The repository's release-readiness notes record all three user lifecycle events subscribed on the production webhook. Those notes are not proof of current development configuration or live production behavior.

## Concrete repair sequence

1. Add `user.deleted` to the existing Clerk **development** endpoint targeting `https://savory-woodpecker-17.convex.site/clerk-webhook`, preserving its creation/update subscriptions.
2. Deliver the verified deletion message above to that endpoint using the dashboard's supported replay facility. If undelivered-event replay is unavailable, invoke the existing internal cleanup for the verified old Clerk ID only.
3. Confirm successful delivery/cleanup through Convex logs and the deletion tombstone. Preserve the newly created identity and other household members; do not bulk-delete by email. Other UAT deletion events exist but require individual identity verification before repair.
4. Confirm the affected household has one remaining member and no membership for the old user, then retry joining with a new identity that does not already belong to another household.
5. Repeat end-to-end member deletion and rejoin UAT. Verify the production webhook separately before beta release.

Validation: the existing account-deletion and user-lifecycle tests pass — 2 suites, 11 tests. These test the cleanup implementation, not real webhook delivery.

## Completed development repair

- Added `user.deleted` to endpoint `ep_38N3MQjz9j5FhHIi5FLBzS1flTd`. Read back the saved subscriptions: `user.created`, `user.deleted`, `user.updated`; displayed update time 11 September 2026 at 12:09 AM local.
- The dashboard's missing-message replay offers only broad time windows. Canceled that dialog without replaying unrelated events.
- Invoked the existing deployed `users:deleteByClerkId` internal mutation on the explicitly selected `savory-woodpecker-17` deployment, with only the verified deleted Clerk ID `user_3J9hciW9psDKC7IfYm7e0jtBv2C`. Result: `deleted_member`. This was an administrative repair through the existing handler, not a webhook delivery replay.
- Compared development records before and after: the old user and membership are absent, its deletion tombstone exists, and Tio has exactly one member (the unchanged owner). All six household list IDs, the empty session set, and all other user IDs are unchanged.
- No app rebuild was necessary. Future automatic delivery still needs end-to-end UAT: join with a fresh identity, delete that account, confirm a successful `user.deleted` webhook and membership removal, then recreate and rejoin. The production webhook remains a separate pre-beta verification item.

## Production subscription verification

Read-only dashboard inspection on 11 September 2026 confirmed production endpoint `ep_3IsuFMLDMBtPXIjMvRuNydP7xQE`, targeting `https://tangible-mink-681.convex.site/clerk-webhook`, already subscribes to `user.created`, `user.deleted`, and `user.updated`. No production configuration change was needed or made. The displayed seven delivery attempts contain creation/update events only, so this verifies subscription configuration, not an end-to-end production deletion. A production test-account deletion remains part of pre-beta UAT.
