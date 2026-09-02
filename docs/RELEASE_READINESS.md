# OurPantry Release Readiness

Status: **Core MVP locally complete; release infrastructure and compliance pending**

This checklist is the source of truth for the closed UK iOS beta. It does not
authorize a production deployment. Repository checkpoints in `AGENT.md` still
apply.

## Completed locally

- Plan / Shop / Spending navigation and hidden Settings route.
- Required four-step household activation with people served, cadence,
  shopping mode, recurring products, and a Next shop.
- Deterministic restock review, tracked-product controls, and duplicate-safe
  list additions.
- Shared shopping-list behaviour, online copy/share handoff, and offline-safe
  item and shop-completion replay.
- Receipt capture/cancellation/session linkage, optional totals, budgets,
  payment source, and spending history.
- UK currency, dates, receipt parsing, stores, and units.
- Consent-gated PostHog adapter and per-member notification preferences.
- Reminder scheduling, send-time authorization, generic lock-screen copy,
  token isolation on sign-out, and per-device Expo receipt checks.
- Explicit account deletion, shared-household ownership transfer, idempotent
  Clerk webhook cleanup, bounded resumable attribution anonymisation, and
  final-household receipt storage deletion.

## Checkpoint J — account deletion implemented locally

The user approved this Clerk/Convex authentication-lifecycle, schema, and index
checkpoint. The source and deterministic local tests are complete; production
provider configuration and a real-provider deletion pass remain release gates.

### User experience

1. Add `Delete account` to the Account section in Settings, visually separated
   from Sign out and styled as destructive.
2. Show a confirmation sheet that explains whether the user is leaving a
   shared household or deleting the household's final account.
3. Require an explicit confirmation action. Do not use email support as the
   deletion mechanism.
4. Reset analytics identity on a best-effort basis, delete the Clerk account
   through Clerk's self-deletion interface, explicitly sign out the local Clerk
   session, clear MMKV, and return to Welcome. A SecureStore recovery marker is
   written before the irreversible provider request and is removed only after
   MMKV erasure and all observed Clerk token-cache keys are removed, so an
   interrupted flow is completed before any app or authentication provider
   mounts on the next launch. A blocking recovery screen retries transient local
   cleanup failures without exposing authenticated content. If post-deletion cleanup
   cannot be verified, report that the account was deleted and give a local
   recovery action instead of claiming deletion failed; do not continue to
   Welcome until a cleanup retry succeeds.
   A definitive Clerk 4xx refusal cancels the marker and preserves local data.
   Network, timeout, missing-user, and server failures are treated as ambiguous:
   the in-memory Clerk session is signed out best-effort, persisted identity is
   erased conservatively, and the UI does not claim whether the provider deletion
   completed.
5. Process Clerk's signed `user.deleted` webhook idempotently so delayed or
   retried webhook delivery cannot leave personal Convex data behind.
6. Verify that the production Clerk/Apple configuration revokes Sign in with
   Apple authorization as required by Apple before release.

### Shared-household semantics

- **Deleting member:** remove their membership and personal preferences,
  reminders, and push tokens. Preserve the other member's household, lists,
  products, sessions, and receipts, while clearing attribution that points to
  the deleted user.
- **Deleting owner with another member:** transfer `households.ownerId` and the
  `owner` membership role to the remaining member before deleting the user.
- **Deleting the final member:** delete the household and all dependent lists,
  items, products, sessions, receipt metadata, private receipt storage, user
  preferences, reminders, tokens, membership, and user record.
- The cleanup mutation must be idempotent and safe when the Clerk webhook is
  delivered more than once. Cleanup runs in bounded mutation batches and
  atomically schedules its continuation while work remains.
- Delayed `user.created` or `user.updated` events update an existing Convex
  user only; they cannot recreate a row after deletion has completed.
- The first deletion batch stores only a domain-separated SHA-256 digest of the
  Clerk user ID, replaces the live user's Clerk ID with a digest-derived
  deletion key, and clears email/name/image fields. Existing server
  authorization lookups therefore stop succeeding while cleanup continues.
  `ensureCurrent` checks the tombstone before using or creating a user, and the
  app signs out any still-valid stale session that matches it.
- Scheduled continuations carry only the digest-derived deletion key. The raw
  Clerk user ID is never written to durable scheduler arguments or application
  logs.

### Exact additive schema/index checkpoint

To remove user attribution without deleting shared household history, make
these existing references optional:

- `lists.createdBy`
- `items.addedBy`
- `receiptUploads.uploadedBy`
- `householdProducts.createdBy`
- `shoppingSessions.shopperId`

`items.completedBy` and `shoppingSessions.paidBy` are already optional and are
cleared when they reference the deleted user. Add optional
`shoppingSessions.paidByFormerMember` so cleared payer attribution remains
distinguishable from a session where no payment source was recorded.
`households.ownerId` remains required and is transferred before an owner is
deleted.

Add these indexes for bounded cleanup:

- `receiptUploads.by_uploaded_by` on `uploadedBy`
- `receiptUploads.by_household` on `householdId`
- `householdProducts.by_created_by` on `createdBy`
- `items.by_completed_by` on `completedBy`
- `shoppingSessions.by_paid_by` on `paidBy`

Add `accountDeletionTombstones` with:

- `clerkIdDigest: string`
- `deletedAt: number`
- `by_clerk_id_digest` on `clerkIdDigest`

The tombstone never stores the raw Clerk ID, email, name, or image. It exists
solely to revoke server access during cleanup and prevent a short-lived JWT
minted before deletion from recreating the Convex user projection. Bounded
continuations are scheduled as internal mutations, which Convex persists
atomically and retries on transient/internal failures.

Migration/backfill behaviour: no production backfill. The tombstone table starts
empty, and existing references stay unchanged. Only the deletion path writes a
tombstone and clears attribution. UI readers render known deleted-user
attribution as `Former household member`; an unrecorded payer remains unlabeled.

### Remaining external verification

- Enable Clerk self-deletion in the production instance.
- Subscribe the production signed Clerk webhook to `user.deleted` and confirm a
  successful delivery reaches `/clerk-webhook`.
- Verify with Clerk and Apple that deleting an Apple-authenticated OurPantry
  account revokes the Sign in with Apple authorization as required by Apple.
- Run one shared-member, shared-owner, and final-member deletion against preview
  services before App Store submission. Confirm preserved household history,
  ownership transfer, private receipt removal, and safe webhook retry behaviour.
- Keep a second device signed in while deleting the account on the first. Confirm
  the stale device is returned to Welcome, its protected server calls are
  rejected immediately, and it cannot recreate the deleted user projection.

## Checkpoint K — EAS and production services

The configuration shape was approved in checkpoint F, but linking external
projects and changing production services still requires explicit approval.

### EAS project and builds

- Decide whether the permanent identifiers remain `com.cartshare.app` and
  `cartshare`, or change before the first store record is created.
- Link/create the EAS project and add `extra.eas.projectId`.
- `eas.json` now contains profiles for:
  - `development`: internal development client;
  - `preview`: internal distribution, production-like environment;
  - `production`: App Store build with auto-incremented build number.
- Verify those profiles against the linked EAS project and environment before
  the first preview build.
- Configure the Apple team, distribution certificate, provisioning profile,
  and APNs key in EAS. Do not commit credentials.
- Audit generated entitlements and remove unused microphone and Face ID
  permission descriptions.

### Environment matrix

Configure these in the appropriate EAS/Convex environment rather than editing
source-controlled `.env` files:

| Scope | Variables |
|---|---|
| Expo client | `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` |
| Convex server | `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `GOOGLE_CLOUD_VISION_API_KEY`, `POSTHOG_API_KEY`, `POSTHOG_HOST` |

Production deployment order:

1. Create production Clerk, PostHog EU, Convex, Google Vision, and EAS
   configuration.
2. Validate OAuth redirects, Convex JWT authentication, and the Clerk webhook
   against a preview build.
3. Run a preview migration/deployment check.
4. Obtain explicit production-deployment approval.
5. Deploy Convex production, build the App Store binary, and keep services live
   for App Review.

## Legal and App Store material

The following content cannot be fabricated and needs product-owner input:

- legal/controller name and contact email;
- privacy-policy and terms URLs;
- collected-data purposes, processors, retention periods, and deletion policy;
- support URL;
- App Store privacy answers, age rating, screenshots, description, keywords,
  review notes, and a working review account/household.

Once supplied, make Terms and Privacy Policy tappable from Welcome and
Settings, and update `PrivacyInfo.xcprivacy` plus App Store privacy disclosures
to match the actual Clerk, Convex, Google Vision, Expo Push, and consented
PostHog data flows.

## Release validation gate

- TypeScript, lint, and all Jest tests pass from a clean checkout.
- `expo-doctor` and Expo dependency checks pass.
- Preview and Release builds install and launch without Metro.
- Google and Apple authentication work with production configuration.
- Two physical devices share one household and sync in both directions.
- Push delivery, tap routing, resolved-review behaviour, quiet hours, daylight
  saving, and stale-token cleanup work on real devices.
- Offline add/edit/toggle/delete/completion replays correctly after reconnect;
  signing out cannot replay the prior user's operations.
- Representative UK receipts parse correctly; cancellation keeps the list
  usable and successful completion links the right list/session.
- Analytics opt-in, withdrawal, sign-out reset, second-user isolation, and
  server-side GeoIP suppression are verified in PostHog EU.
- Shared-member, owner-transfer, final-member, and retried-webhook account
  deletion are verified against preview Clerk and Convex services.
- VoiceOver, Dynamic Type, Reduce Motion, dark appearance, camera denial, and
  notification denial have been manually checked.
- Closed TestFlight beta is completed before App Store submission.
