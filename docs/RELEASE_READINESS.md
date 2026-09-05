# OurPantry Release Readiness

Status: **Core MVP, legal foundation, and production services complete; TestFlight build 5 uploaded and Apple processing/external beta verification pending**

This checklist is the source of truth for the closed iOS beta. The initial
receipt, currency, date, unit, and retailer adapter remains GB-specific. This
document does not authorize any further production deployment. Repository checkpoints in
`AGENT.md` still apply.

## Completed locally

- Plan / Shop / Pantry / Spending navigation and hidden Settings route.
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
- Dynamic household grocery memory for all completed items, with one
  product/session observation, explicit learning/active/paused states, a
  possible-regular review surface, and consolidated opt-in learning pushes.
- Bounded, idempotent historical product-memory backfill that preserves explicit
  tracking choices and never emits historical notifications. The configured
  development deployment was checked on 3 September 2026 and contained no
  historical sessions to migrate.
- Explicit account deletion, shared-household ownership transfer, idempotent
  Clerk webhook cleanup, bounded resumable attribution anonymisation, and
  final-household receipt storage deletion.

## Checkpoint J — account deletion implemented locally

The user approved this Clerk/Convex authentication-lifecycle, schema, and index
checkpoint. The source and deterministic local tests are complete; production
webhook delivery is verified, while real-provider deletion passes remain release
gates.

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
  items, products, product-purchase observations, sessions, receipt metadata,
  private receipt storage, user
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
- Run a real production or preview Clerk `user.deleted` event and confirm the
  delivered cleanup result in Convex.
- Verify with Clerk and Apple that deleting an Apple-authenticated OurPantry
  account revokes the Sign in with Apple authorization as required by Apple.
- Run one shared-member, shared-owner, and final-member deletion against preview
  services before App Store submission. Confirm preserved household history,
  ownership transfer, private receipt removal, and safe webhook retry behaviour.
- Keep a second device signed in while deleting the account on the first. Confirm
  the stale device is returned to Welcome, its protected server calls are
  rejected immediately, and it cannot recreate the deleted user projection.

## Checkpoint K — EAS and production services

The configuration shape was approved in checkpoint F, and linking the Expo
project plus non-production EAS configuration was approved for this checkpoint.
Changing production services still requires separate explicit approval.

### Execution status — 6 September 2026

- Linked the repository to the Expo project `@jtioluwani/ourpantry`
  (`c2227d67-2e66-4150-88c0-7944fe0dffd2`) and recorded the project owner and
  ID in Expo app config.
- Pinned EAS builds to Node 22.23.2 and pnpm 10.6.4. Added a credential-free
  `preview-simulator` profile alongside the development, device-preview, and
  production profiles.
- Added the approved Convex URLs and Clerk publishable keys to the EAS
  `development`, `preview`, and `production` environments with sensitive
  visibility. No development Clerk key was reused in production.
- Added a dedicated Convex TypeScript project configuration. The production dry
  run passed, and the reviewed production functions and schema were deployed on
  5 September 2026 with typechecking enabled.
- The production Convex environment contains `CLERK_JWT_ISSUER_DOMAIN`,
  `CLERK_WEBHOOK_SECRET`, `GOOGLE_CLOUD_VISION_API_KEY`, `POSTHOG_API_KEY`, and
  the EU `POSTHOG_HOST`. The matching public, write-only PostHog project token
  and EU host are stored in all three EAS environments.
- EAS build `e2b50475-ca22-48d3-bec2-e3eca1be94ad` completed successfully for
  the iOS `preview-simulator` profile as OurPantry 1.0.0 (build 1), bundle ID
  `app.ourpantry`, without Apple credentials. This validates cloud packaging
  and native compilation but is not a signed device, TestFlight, or App Store
  build.
- Apple Developer Program enrolment is active for the Individual team
  `5L6QPNNMP8`, and the checked-in Xcode project and Expo config now agree on
  that Team ID. EAS now holds a valid distribution certificate and active App
  Store provisioning profile for `app.ourpantry`.
- EAS build `b3cf78a6-63bd-41f7-b13d-db5bc82a1fd4` completed successfully for
  the iOS `production` profile as OurPantry 1.0.0 (build 4). Inspection of the
  signed IPA confirmed the display name and bundle identifier, the Individual
  team application identifier, `get-task-allow = false`, TestFlight beta-report
  support, and `aps-environment = production`. The build has not been submitted
  to App Store Connect.
- EAS build `106c4f06-4c14-4fbf-aa29-7b8044f4e7c7` completed successfully for
  the iOS `production` profile as OurPantry 1.0.0 (build 5) from commit
  `883e3ed9c43adb1888d559d90901f02797b581c0`. The matching reviewed Convex
  schema and functions were deployed to production with typechecking enabled.
- App Store Connect app `6809059306` is linked to bundle ID `app.ourpantry`, and
  its ID is recorded in the EAS production submission profile. EAS created the
  internal TestFlight group `Team (Expo)`, enabled the account holder as an
  internal tester, and uploaded build 5 successfully. Apple is processing the
  binary before it becomes selectable in TestFlight.
- Apple Push Notifications key `888WSH9FC5` was created through EAS and assigned
  to `app.ourpantry`. Together with the production entitlement verified in the
  signed IPA, the Apple credential layer is ready for device push-notification
  UAT. End-to-end delivery and notification deep links still require TestFlight
  verification.
- A dedicated PostHog Cloud EU project was created for OurPantry. Client
  autocapture, heatmaps, Web Vitals capture, session replay, and error
  autocapture are disabled; client IP data is discarded. Product events remain
  behind explicit per-member opt-in and a typed property allow-list. The
  measurement definitions live in `docs/ANALYTICS_MEASUREMENT_PLAN.md`.

### Production environment preparation — 5 September 2026

- Apple Developer Program membership is active as an Individual membership for
  Team ID `5L6QPNNMP8` (renewal date 6 September 2027). The verified team is now
  used by both Expo config and the checked-in Xcode project.
- A Clerk production instance was created from the development configuration.
  `clerk.ourpantry.app` and the related account and mail DNS records are live,
  and Clerk reports the custom domain as verified. A replacement production
  user-sync webhook targets the Convex production HTTP action with
  `user.created`, `user.updated`, and `user.deleted` subscribed. Its signing
  secret is installed in Convex. A signed production request returned `200 OK`,
  and the superseded endpoint was deleted after verification.
- The EAS `production` environment now contains the production Clerk
  publishable key and both production Convex public URLs. No development key
  was reused.
- The Convex production deployment has the verified Clerk custom-domain issuer,
  the replacement Clerk webhook signing secret, and the restricted Google
  Vision API key configured. Production HTTP actions, functions, and schema are
  deployed with typechecking enabled.
- Google Cloud project `ourpantry-production` has billing linked, Cloud Vision
  enabled, and a dedicated API key restricted to the Cloud Vision API. Google
  OAuth client credentials and their Clerk production connection remain to be
  completed.
- The current signed App Store candidate is build 5. It has been uploaded to
  App Store Connect and is awaiting Apple processing before internal TestFlight
  installation. Production Google OAuth client credentials and their Clerk
  production connection remain to be completed before external beta testing if
  Google sign-in remains visible.

### Pre-checkpoint dependency health

The 3 September 2026 local pass has green TypeScript, ESLint, plist validation,
resolved Expo config, all 339 Jest tests across 81 suites, and a successful
arm64 iOS Simulator compile/link with code signing disabled. The approved dependency tranche
installed the direct peers required by the current Clerk/Reanimated stack
(`expo-auth-session`, `react-dom`, and `react-native-worklets`), aligned all nine
Expo SDK 54 package drifts, and regenerated the iOS pod lockfile. Expo Doctor
now passes 17 of 18 checks. Run release tooling on an Expo Doctor-supported Node
LTS version rather than Node 23.

Expo Doctor also warns that app-config fields are not automatically synced when
checked-in `ios` and `android` directories exist. The privacy manifest and
unused-permission cleanup are synchronized in both app config and native source
in this tranche. Checkpoint K must treat the native projects as authoritative
and inspect the resolved archive rather than assuming a future app-config edit
was applied.

The separately approved Clerk Core 3 migration is complete. The app now uses
`@clerk/expo`, registers its Expo config plugin, and uses the supported
browser-based `useSSO()` flow for both Google and Apple. This preserves the
existing sign-in UX while removing the deprecated `@clerk/clerk-expo` package
and `useOAuth()` hook. The installed Clerk Expo 3.7.8 native module requires
iOS 17, so the Expo and checked-in Xcode deployment targets are both 17.0.
Validate both providers against production credentials in Checkpoint K.

### EAS project and builds

- Permanent product identity is now `OurPantry`, with iOS and Android identifier
  `app.ourpantry`, Expo slug `ourpantry`, and deep-link scheme `ourpantry`.
- Register `app.ourpantry` in Apple Developer, Google/Firebase where applicable,
  Clerk's native application settings, and EAS before creating store builds.
- Link/create the EAS project and add `extra.eas.projectId`.
- `eas.json` now contains profiles for:
  - `base`: shared Node and pnpm release-tool versions;
  - `development`: internal development client;
  - `preview`: internal distribution, production-like environment;
  - `preview-simulator`: credential-free iOS simulator validation;
  - `production`: App Store build with auto-incremented build number.
- Verify those profiles against the linked EAS project and environment before
  the first preview build.
- Configure the Apple team, distribution certificate, provisioning profile,
  and APNs key in EAS. Do not commit credentials.
- The unused microphone and Face ID permission descriptions are removed from
  the checked-in native projects, and the Expo camera/SecureStore plugin options
  keep them out of future prebuilds. Re-check the final generated entitlements
  and permissions after Checkpoint K.

### Environment matrix

Configure these in the appropriate EAS/Convex environment rather than editing
source-controlled `.env` files:

| Scope         | Variables                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo client   | `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` |
| Convex server | `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`, `GOOGLE_CLOUD_VISION_API_KEY`, `POSTHOG_API_KEY`, `POSTHOG_HOST`                                     |

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

Verified product-owner inputs as of 3 September 2026:

- operator/controller: Tioluwani Kolawole, trading as OurPantry;
- public contact: `support@ourpantry.app`, with inbound delivery verified;
- ICO data-protection fee self-assessment completed: no fee is currently due
  because OurPantry has not started trading, and the ICO does not need to be
  notified; retake the assessment when trading begins;
- the privacy policy, terms, support, and account-deletion pages are deployed
  and verified over HTTPS at `https://ourpantry.app`, with
  `https://www.ourpantry.app` and the Pages domain redirecting or serving the
  same project;
- the legal baseline documents the current collected-data purposes,
  processors, retention criteria, deletion behaviour, Sign in with Apple
  guidance, provider backup behaviour, and support route;
- Welcome and Settings link to the branded Privacy Policy and Terms of Use;
  Settings also links to the public support route;
- `app.json` and the checked-in iOS privacy manifest declare the implemented
  data flows with tracking disabled, and
  `docs/APP_STORE_PRIVACY_DISCLOSURES.md` maps them to App Store Connect.

Remaining external completion is limited to entering and verifying the privacy
answers in App Store Connect against the final archived build, selecting the age
rating, supplying screenshots, description, keywords and review notes, and
providing a working review account/household. Re-run the privacy review if the
production Clerk, Convex, Google Vision, Expo Push, or PostHog configuration
differs from the documented MVP data flows.

## Release validation gate

- TypeScript, lint, and all Jest tests pass from a clean checkout.
- `expo-doctor` and Expo dependency checks pass.
- Preview and Release builds install and launch without Metro.
- Google and Apple authentication work with production configuration.
- Two physical devices share one household and sync in both directions.
- Push delivery, tap routing, resolved-review behaviour, quiet hours, daylight
  saving, and stale-token cleanup work on real devices.
- Possible-regular detection, one-per-session learning push, notification deep
  link, cross-member resolution, and first-purchase/retry suppression work on
  two real devices.
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
