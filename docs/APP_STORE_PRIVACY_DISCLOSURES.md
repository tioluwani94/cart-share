# App Store privacy disclosures

Status: **implementation-backed draft for App Store Connect**

This document maps the data flows in the current OurPantry MVP to Apple's app
privacy categories. It is the release checklist for App Store Connect, not a
replacement for the public [Privacy Policy](https://ourpantry.app/privacy).
Re-check it against the archived production build and provider dashboards
before submission whenever a dependency, processor, analytics event, or data
flow changes.

## App Store Connect answers

- **Does this app collect data?** Yes.
- **Is any data used to track users?** No.
- **Is collected data linked to the user's identity?** Yes, for every category
  listed below. OurPantry is an account-and-household product, and the backend
  records are associated with the signed-in user or their household.
- **Advertising purposes:** None.
- **Third-party advertising:** None.
- **Analytics:** Product Interaction plus User ID and Device ID, only after the
  member explicitly enables usage analytics. PostHog is configured with default
  opt-out, GeoIP disabled, session replay disabled, error autocapture disabled,
  and an allow-listed event/property contract.

| Apple data type | What OurPantry collects | Purpose(s) | Main processor(s) |
|---|---|---|---|
| Name | Optional account display name and household-member display | App Functionality | Clerk, Convex |
| Email Address | Account identity and authentication email | App Functionality | Clerk, Convex |
| Photos or Videos | Optional receipt images selected or captured by the member | App Functionality | Convex Storage, Google Cloud Vision |
| Other User Content | Household name, invite membership, grocery lists, item names, quantities, units, notes, categories, planning preferences and reminder choices | App Functionality; Product Personalization | Convex |
| User ID | Clerk user ID and internal user/household references | App Functionality; Analytics when consented | Clerk, Convex, PostHog EU when consented |
| Device ID | Per-install notification device identifier, Expo push token, and analytics SDK device identifier when consented | App Functionality; Analytics when consented | Convex, Expo Push, PostHog EU when consented |
| Purchase History | Completed grocery items, shop dates, stores, totals and receipt-derived purchase history | App Functionality; Product Personalization | Convex, Google Cloud Vision for optional receipt extraction |
| Other Financial Info | Optional household grocery budget and grocery-spending totals; no bank, card or payment credentials | App Functionality | Convex |
| Product Interaction | Allow-listed feature interaction and lifecycle events; never item names, receipt text, or grocery amounts | Analytics | PostHog EU when consented |

Every row above is marked **linked to the user: yes** and **used for tracking:
no** in both `app.json` and the checked-in native `PrivacyInfo.xcprivacy`.

## Data not collected by the MVP

Do not select these categories unless the implementation changes:

- payment card, bank-account, credit, or other payment credentials;
- physical address or phone number;
- precise or coarse location (locale and time zone are used without location
  permission);
- contacts, health/fitness, browsing history, search history, advertising data,
  or sensitive-information fields;
- crash or performance diagnostics through PostHog (autocapture is disabled).

Provider security and operational logs are described in the public policy.
During Checkpoint K, compare the production services' enabled features and the
Xcode privacy report for the archived build against this list. If a provider is
configured to collect another App Store category, disclose it before submission
even when its SDK ships a separate privacy manifest.

## Privacy-manifest maintenance

The Expo source configuration and native iOS manifest intentionally contain the
same application-level declarations:

- `app.json` under `expo.ios.privacyManifests` is the prebuild source of truth;
- `ios/CartShare/PrivacyInfo.xcprivacy` protects the checked-in native project
  from configuration drift;
- SDK-owned required-reason declarations remain in each dependency's privacy
  manifest, while the existing app-level aggregate covers the required-reason
  APIs present in the current native build.

Apple distinguishes the app privacy manifest from App Store Connect privacy
answers: the store answers must cover the app and every third-party partner.
The release archive's privacy report is therefore the final verification
artifact, not a substitute for this implementation review.

## Build 8 artifact verification — 8 September 2026

Inspected the production IPA from EAS build
`d134766f-e9aa-47d7-a2df-2e7a909c5f79` (`1.0.0 (8)`). The compiled app-level
`PrivacyInfo.xcprivacy` contains the nine data categories above, all linked to
the user and not used for tracking; `NSPrivacyTracking` is false and the tracking
domain list is empty. The compiled Info.plist includes the receipt camera
purpose string and no microphone, photo-library, location or contacts usage
description. This verifies the packaged declarations, not the absence of all
provider-side collection. The aggregate SDK privacy report and production
provider settings still require review before final App Store answers.

### SDK reconciliation still required

The same IPA contains 21 privacy manifests. The bundled Google Sign-In manifest
adds Phone Number, Coarse Location, Other Data Types and Other Usage Data beyond
our app-level table; its eight declared categories are linked and not used for
tracking. The other SDK manifests examined contain no collected-data entries.
Do not interpret the app-level nine-category match as full SDK disclosure
approval or blindly copy every SDK capability into the app's store answers.

The current welcome screen calls Clerk `useSSO`; the installed Clerk 3.7.8
implementation invokes `expo-web-browser.openAuthSessionAsync`, not the native
Google Sign-In bridge. The separately bundled `ClerkGoogleSignInModule` requires
explicit configuration before native sign-in. This source evidence explains a
possible unused-capability discrepancy, but does not prove every provider's
runtime collection is absent. Google documents that its native SDK may collect
user identifiers and IP-derived general location for fraud prevention:
[Google's disclosure guidance](https://developers.google.com/identity/sign-in/ios/app-privacy).

Before final privacy answers, reconcile the aggregate archive report with the
actual OAuth flow and production Clerk/Google settings. If ambiguity remains,
obtain provider clarification or propose excluding the unused native module
for owner approval; do not silently change authentication/dependencies or strip
the vendor's privacy manifest. Public privacy submission remains an open gate.

## Public release URLs

- Privacy Policy: https://ourpantry.app/privacy
- Terms of Use: https://ourpantry.app/terms
- Support: https://ourpantry.app/support
- Account deletion: https://ourpantry.app/account-deletion

## Authoritative references

- [Apple — App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple — Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Apple — Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)
- [Expo — Apple privacy manifests](https://docs.expo.dev/guides/apple-privacy/)
