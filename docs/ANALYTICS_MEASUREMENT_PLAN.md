# OurPantry analytics measurement plan

Status: **PostHog Cloud EU configured; local instrumentation ready for device
and TestFlight verification**

This document defines the closed-beta measurement contract. It is intentionally
smaller than the product domain: analytics should answer product questions
without rebuilding a household's shopping data inside PostHog.

## Success measure

The north-star metric is **weekly active households completing a shop**. Count
unique `household_id` values on `shop completed` in a rolling seven-day window.
The household property is an opaque Convex identifier, not a household name.

Supporting measures:

- activation-to-first-list conversion;
- activation-to-first-completed-shop conversion;
- households completing another shop within 7, 14, and 28 days;
- completed shops that produce a restock decision before the next completed
  shop;
- invitation share-to-household-join conversion;
- notification open-to-restock-decision conversion.

## Consent and privacy boundary

- Analytics is off by default. A person sees a skippable consent screen after
  activation has produced the first useful plan. Already-activated beta
  accounts with no recorded choice see it once on their next app entry. The
  choice remains editable in Settings.
- No event is queued, captured, or used for identification before consent.
- Identification uses only the opaque Clerk user ID plus opaque Convex
  `household_id`.
- Never send names, email addresses, invite codes, product or retailer names,
  item notes, receipt images or OCR text, exact spend, exact budgets, exact
  product counts, or exact planned-shop dates.
- Counts, lead times, household sizes, and cadences cross the analytics seam
  only as reviewed buckets.
- Client autocapture, heatmaps, Web Vitals capture, session replay, error
  autocapture, and IP retention are disabled. App lifecycle events remain
  enabled.
- Sign-out flushes only already-consented events, resets the PostHog identity,
  and opts the client out before another person can use the app.
- Server capture is best-effort. An analytics outage must never interrupt push
  delivery or notification retry bookkeeping.

## Event contract

The source of truth for property types and allow-list enforcement is
`lib/analytics.ts`.

| Event | Purpose | Reviewed properties |
| --- | --- | --- |
| `activation started` | Activation entry | market, platform, app version |
| `activation completed` | Activation success | household-size bucket, cadence bucket, shopping mode |
| `activation skipped` | Step friction | step identifier |
| `shopping list created` | First and repeat list creation | activation/plan source |
| `shopping item added` | List-building habit | active-shop/list-detail/restock source |
| `shop planned` | Planning behaviour | days-until-shop bucket |
| `shop started` | Shopping-mode adoption | physical/online mode |
| `shop completed` | Core value moment | item-count bucket, total-present, receipt-present |
| `receipt attached` | Receipt adoption | camera/library source |
| `restock review shown` | Restock opportunity | candidate-count bucket, plan/notification source |
| `restock decision made` | Restock utility | decision category and source |
| `possible regular reviewed` | Learning-loop adoption | decision and source |
| `tracked product corrected` | Pantry maintenance | field category only |
| `household invite shared` | Collaboration intent | settings source |
| `household member joined` | Collaboration conversion | invite-code source |
| `notification permission answered` | Push opt-in | granted/denied/provisional |
| `notification scheduled` | Server notification pipeline | notification kind |
| `notification sent` | Delivery submission | kind and accepted/failed/retry-scheduled result |
| `notification opened` | Push re-entry | notification kind |
| `tab viewed` | High-level navigation | Plan/Shop/Pantry/Spending only |

## PostHog views

Create these saved views after the first consented beta events arrive so the
event selectors are backed by real production events. Exclude any internal
validation traffic if it is ever introduced.

### Activation

Funnel, unique users:

1. `activation completed`
2. `shopping list created`
3. `shop completed`

Break down by `shopping_mode`; inspect conversion within 7 days.

### Core loop

Funnel, unique households using `household_id`:

1. `shop completed`
2. `restock decision made`
3. next `shop completed`

Inspect within 28 days. The first and third steps must be separate funnel steps,
not a single aggregated count.

### Retention

Retention, unique households using `household_id`:

- cohort start: first `shop completed`;
- return event: `shop completed`;
- windows: 7, 14, and 28 days.

### Collaboration

Funnel, unique users:

1. `household invite shared`
2. `household member joined`

These events occur on different user IDs, so household-level conversion should
be evaluated with `household_id` rather than strict same-user funnel ordering.

## Verification checklist

- Grant consent on a clean activation and confirm identification plus
  `activation completed` in PostHog EU.
- Decline consent on another account and confirm no product events appear.
- Complete a list and shop; confirm no item name, amount, retailer, note, or
  receipt property is present.
- Sign out, sign in as a different tester, and confirm distinct identities are
  not merged.
- Enable and then withdraw analytics in Settings; confirm capture stops.
- Trigger a consented push and confirm scheduled/sent/opened events use only the
  notification kind and delivery result.
- Build the saved PostHog views above after the first real consented event set
  makes the custom event names selectable.
