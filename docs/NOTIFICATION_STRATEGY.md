# OurPantry Notification Strategy and Cadence

Status: **MVP contract plus post-MVP hypotheses — future entries are not an
implementation commitment**

Initial market: **UK households, iOS first**

Last updated: **2 September 2026**

## 1. Purpose

Notifications should reduce grocery mental load, not manufacture daily app
usage. OurPantry is organised around a household shopping cycle, so a healthy
notification system should help someone make one useful decision at the right
time and then become quiet again.

This document separates the notification behaviour already implemented for the
MVP from candidate notifications that require beta evidence, product approval,
and implementation planning.

## 2. Notification principles

- Prefer household events and the member's chosen shopping rhythm over generic
  daily reminders.
- Batch related products into one useful prompt. Never send one push per product.
- Notify only when there is a clear action the recipient can take immediately.
- Re-check authorization and current household state at send time so a stale
  reminder cannot reveal or reopen old work.
- Keep lock-screen copy generic. Do not include product names, receipt details,
  spending amounts, or another member's private information.
- Respect per-member preferences and time zones. One member's choice must not
  alter another member's notification settings.
- Cancel a reminder once another household member has resolved the underlying
  task.
- Prefer in-app status, widgets, and Live Activities for ambient information.
  Push should be reserved for timely handoffs and unresolved decisions.
- Do not use streaks, guilt, false urgency, or repeated “we miss you” prompts.
- Measure completed shopping cycles and useful actions, not notification opens
  in isolation.

## 3. MVP notification contract

The MVP has one notification family: **restock planning**. It contains no more
than two notifications for a member in one household shopping cycle.

| Notification | Trigger | Cadence | Recipient and timing | Destination |
|---|---|---|---|---|
| Restock review | At least one tracked product becomes eligible for review and is not already on the active list | Once per member per shopping cycle | At the member's selected local time, not before the earliest eligible review time | Plan restock-review state |
| Shop reminder | Eligible products remain unresolved shortly before a dated Next shop | At most once per member per shopping cycle | Approximately 24 hours before the planned shop, at the member's selected local time; omitted when no valid delivery time remains before the shop | Plan restock-review state |

### 3.1 Delivery-time rules

- Notifications are off until a member explicitly enables them and the device
  grants notification permission.
- The default chosen delivery time is **18:00** in the member's saved IANA time
  zone.
- Quiet hours are **20:00–08:00**. The selectable window is 08:00 inclusive to
  20:00 exclusive.
- Scheduling uses the member's local calendar time and recalculates UTC delivery
  across daylight-saving changes.
- The backend evaluates due reminders every **15 minutes**, so delivery is
  expected within the next scheduler window rather than at an exact second.
- One reminder record is deduplicated by member, household, shopping cycle, and
  notification kind. Recalculation updates pending timing rather than creating a
  duplicate.

### 3.2 Eligibility and cancellation

Before delivery, the backend confirms that:

- the member still belongs to the household;
- the member still has restock notifications enabled;
- the recipient device token is still enabled and belongs to that member;
- the household and active list still exist; and
- at least one unresolved restock candidate still exists.

Pending reminders are recalculated or cancelled after relevant preference,
Next-shop, tracked-product, list, or restock-decision changes. Products already
on the active list are excluded. Opening a push after another member resolves
the review shows current state rather than stale actions.

### 3.3 Copy and privacy

Both MVP notification kinds use consolidated copy such as:

> Your next shop needs a quick check
>
> 3 things may need a quick check before Saturday.

The copy can expose the number of unresolved decisions and the planned weekday,
but not individual products, prices, receipt data, or member activity.

### 3.4 Delivery failure behaviour

- Permanently unregistered Expo tokens are disabled.
- Transient ticket failures retry with bounded exponential backoff.
- Expo receipts are checked with bounded retries.
- Rate-limited single-device deliveries are retried only while the member,
  token, preference, and underlying review remain valid.
- A retry must not create an additional user-visible reminder after a delivery
  has already been accepted.

## 4. Post-MVP notification candidates

These candidates should be introduced individually and only when the stated
evidence gate is met. Cadences are starting hypotheses for beta testing, not
approved product requirements.

| Candidate | Proposed trigger and cadence | Default channel | Evidence gate |
|---|---|---|---|
| Shopping-started handoff | When one member starts a shop, notify the other member once per shopping session: “Shopping has started — anything else?” Suppress when the recipient is already active in the list or the shop has finished. Do not queue a stale overnight delivery. | Optional push during allowed hours; otherwise in-app activity | Households miss late additions or repeatedly message outside the app |
| Incomplete-shop recovery | One prompt 2–4 hours after a shopping session becomes inactive while still open. Never repeat for the same session. | In-app first; optional push after validation | Beta users accidentally leave sessions open often enough to damage restock learning or spend history |
| Missing-spend follow-up | One prompt after a completed shop without a total, preferably bundled into the next app open. Do not notify when the member explicitly selected “Skip for now.” | In-app | Spend completion is valuable but materially under-recorded because of forgetfulness rather than intentional skipping |
| Factual shop recap | Show immediately after completion; do not push by default. It may state items collected, regulars remembered, household contribution, and observed budget variance. | In-app card | The facts are reliable and users report that the recap makes invisible value understandable |
| Budget pace | At most one useful monthly insight, or one threshold alert when observed spend materially crosses a member-selected budget threshold. Never send routine weekly summaries with no decision attached. | In-app first; separately opt-in push | Households record enough spend for the calculation to be representative and act on the insight |
| Price-change digest | Batch reliable changes in household regulars into no more than one weekly digest. Do not alert on low-confidence OCR matches or ordinary noise. | Separately opt-in push or email | Line-item identity, quantity normalization, and confidence thresholds are trustworthy |
| Meaningful price drop | One timely alert for a tracked regular only when licensed/current price data clears a member-selected threshold. Batch overlapping alerts. | Separately opt-in push | Licensed data and unbiased ranking exist; alerts demonstrate savings without excessive false positives |
| Household joined | Notify the existing member once when an invited person successfully joins. | Transactional push or in-app | Beta shows the inviter otherwise fails to notice activation or complete setup |
| Subscription lifecycle | Use StoreKit and App Store system surfaces for billing. App messaging may explain an entitlement change, but marketing renewal pushes are not a core engagement tool. | System/in-app | Monetisation has been approved and implemented |

## 5. Recommended notification budget after MVP

Adding more notification types must not silently defeat the calm MVP cadence.
Use the following initial budget when a post-MVP candidate is approved:

- **Planning:** retain the hard maximum of two restock-planning pushes per member
  per shopping cycle.
- **Live coordination:** at most one shopping-started handoff per recipient per
  shopping session.
- **Recovery:** at most one recovery prompt per shopping session, and do not send
  it on the same day as a non-urgent planning push unless research demonstrates
  clear value.
- **Insights:** off by default until the data is reliable; at most one budget or
  price digest in seven days.
- **Global guardrail:** outside live household coordination, send no more than
  one proactive push to a member in 24 hours. Transactional security or account
  messages are handled separately.

If several prompts compete for the same window, prioritize them in this order:

1. a live household handoff that will become useless soon;
2. an unresolved pre-shop decision;
3. a session recovery action;
4. an informational budget or price insight.

Lower-priority information should move into the next in-app summary rather than
waiting to become a stale push.

## 6. Preference model for future implementation

Keep one top-level notification switch, then expose categories only after more
than one family exists:

- Restock planning
- Live household coordination
- Budget and spending insights
- Price alerts

Each category must be per member. Future implementation should retain one local
delivery time and time zone for routine prompts, with optional category-specific
controls only if research shows that members need them. Marketing consent must
remain separate from functional notification preferences.

## 7. Measurement and promotion criteria

For each notification kind, record privacy-safe events for scheduled, sent,
opened, cancelled, and acted upon. Evaluate:

- action completion after delivery, not just open rate;
- duplicate, stale, or already-resolved deliveries;
- opt-out and operating-system permission-denial rates;
- notification volume per member and shopping cycle;
- whether the prompt reduces forgotten items or coordination messages; and
- whether retained households still consider the product calm and trustworthy.

A candidate should graduate only when it causes a meaningful household action
without increasing opt-outs or complaints. Remove or reduce any notification
that produces opens without improving the shopping cycle.

## 8. Implementation checklist for a new notification

Every proposed notification requires an approved implementation brief covering:

1. the precise source event and recipient;
2. a durable deduplication key and cancellation conditions;
3. quiet-hour, time-zone, and daylight-saving behaviour;
4. send-time membership, preference, and state authorization;
5. generic lock-screen copy and a current-state deep link;
6. retry, receipt, stale-token, and sign-out behaviour;
7. per-member settings and permission handling;
8. privacy-safe analytics and a measurable success criterion;
9. unit tests plus two-device physical UAT; and
10. a rollout and rollback plan.

New notification categories may require schema, environment, navigation, or
dependency changes and therefore remain subject to the approval checkpoints in
`AGENT.md`.

## 9. Related documents

- [`NEXT_SHOP_MVP_BRIEF.md`](NEXT_SHOP_MVP_BRIEF.md) — approved MVP behaviour
- [`POST_MVP_PRODUCT_AND_MONETISATION.md`](POST_MVP_PRODUCT_AND_MONETISATION.md)
  — retention and monetisation hypotheses
- [`RELEASE_READINESS.md`](RELEASE_READINESS.md) — production notification and
  device-verification gates
