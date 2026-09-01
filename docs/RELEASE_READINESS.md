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

## Checkpoint J — account deletion design

Account deletion changes the Clerk/Convex authentication lifecycle, schema,
and indexes. Do not implement it until the user approves this exact design.

### User experience

1. Add `Delete account` to the Account section in Settings, visually separated
   from Sign out and styled as destructive.
2. Show a confirmation sheet that explains whether the user is leaving a
   shared household or deleting the household's final account.
3. Require an explicit confirmation action. Do not use email support as the
   deletion mechanism.
4. Delete the Clerk account through Clerk's self-deletion interface, then clear
   local MMKV data and return to Welcome.
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
  delivered more than once.

### Exact additive schema/index checkpoint

To remove user attribution without deleting shared household history, make
these existing references optional:

- `lists.createdBy`
- `items.addedBy`
- `receiptUploads.uploadedBy`
- `householdProducts.createdBy`
- `shoppingSessions.shopperId`

`items.completedBy` and `shoppingSessions.paidBy` are already optional and are
cleared when they reference the deleted user. `households.ownerId` remains
required and is transferred before an owner is deleted.

Add these indexes for bounded cleanup:

- `receiptUploads.by_uploaded_by` on `uploadedBy`
- `householdProducts.by_created_by` on `createdBy`

Migration/backfill behaviour: no production backfill. Existing references stay
unchanged. Only the deletion path clears attribution. UI readers render missing
attribution as `Former household member`.

## Checkpoint K — EAS and production services

The configuration shape was approved in checkpoint F, but linking external
projects and changing production services still requires explicit approval.

### EAS project and builds

- Decide whether the permanent identifiers remain `com.cartshare.app` and
  `cartshare`, or change before the first store record is created.
- Link/create the EAS project and add `extra.eas.projectId`.
- Add `eas.json` profiles for:
  - `development`: internal development client;
  - `preview`: internal distribution, production-like environment;
  - `production`: App Store build with auto-incremented build number.
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
- VoiceOver, Dynamic Type, Reduce Motion, dark appearance, camera denial, and
  notification denial have been manually checked.
- Closed TestFlight beta is completed before App Store submission.
