# OurPantry V2 — Consolidated Product Backlog

Status: **Proposed V2 scope and sequencing; documentation only, not implemented**

Last updated: **21 September 2026**

V1 is in beta. This is the canonical feature-level V2 backlog, combining the
existing [post-MVP strategy](POST_MVP_PRODUCT_AND_MONETISATION.md) with the
September discussion about Amy-style entry, purchase imports, and Jev. The
strategy retains market research and monetisation hypotheses; the
[notification strategy](NOTIFICATION_STRATEGY.md) retains notification rules.
Scope and priority below are recommendations for planning, not a promise that
every post-MVP opportunity ships in V2.

## 1. V2 objective

> Keep restock suggestions useful without making the household enter everything
> it buys.

Preserve grocery memory as the core product. Reduce the work of supplying
purchase evidence; reuse the existing restock review and feedback loop. A
purchase is evidence of buying something, not proof of remaining stock or an
expiry date. Do not require consumption logging or a kitchen inventory.

Two explicit capture intents share product matching and editable previews:

- **We need…** — type or paste several items into the shared Next shop.
- **We bought… / Record a shop** — import a receipt, order screenshot, or text
  to record actual purchases and improve household memory.

The first useful journey is:

```text
Receipt photo or order screenshot
  → editable purchase preview
  → confirm one shop
  → update household product history
  → review likely restocks before the next shop
  → add / still have some / not this time
```

## 2. Existing capability and overlap audit

The baseline is checked-in source inspected on 21 September 2026, including
notification integration at `fb3d9d6`, not a fresh production or device audit.
“Existing” means implemented in source, not proven effective in beta. Earlier
roadmap wording is not evidence of missing code.

| Existing follow-on idea | What already exists | Actual remaining work | Consolidated disposition |
| --- | --- | --- | --- |
| Natural-language entry (§7.1) + Amy-style free-form entry | Single-item list entry, quantities, shared/offline list operations | Parse a batch of text into editable items; distinguish needs from purchases | **V2-04**, one feature, not separate AI and quick-entry projects |
| Receipt line items (§7.9; original PRD F4.1.8–9) + receipt/order screenshots | Camera, private receipt upload, OCR total confirmation, shopping sessions | Image-library input, line-item extraction, purchase preview, matching and list-independent learning | **V2-01–03**, promoted from the later price layer into core V2 |
| Suggested matches, correction and merge (§7.9) + Jev matching | Product identity normalises case/whitespace; Pantry has visual aliases | Household-confirmed identity matches and remembered corrections; separate meaningful variants | **V2-02**, shared by imports and free-form entry |
| Prepared shop (§7.2) | Plan, Next shop, Quick check, tracked regulars and one-tap restock decisions | Feed imported purchases into this experience; add factual explanation only where needed | **V2-03**; do not rebuild Plan or count restock review as a new feature |
| Pre-shop ritual (§7.3) | Restock review, learning prompts, and a scheduled-shop reminder independent of restock candidates; registration recovery implemented | Finish delivery UAT; adapt learning to confirmed imports while retaining the distinct notification timing rules | Existing capability extended by **V2-03**; delivery validation remains beta maintenance |
| Household handoff (§7.4) | Shared item state, attribution, in-app partner-add toast, grouped list-activity and shop-completion alerts in integrated code | Finish activity-alert UAT; optional shopping-started handoff remains new work | **V2-06** covers only the additional handoff; do not build grouped/completion alerts twice |
| Factual value recap (§7.5) | Shop history, receipt totals, planned/actual and trip-budget comparisons | A concise completion recap with reliable counts and attribution | **V2-05**, supporting scope; do not duplicate Spending |
| Widgets, Siri/App Intents, quick actions, share extension, favourite shortcuts (§7.1) | In-app item entry and regular selection | Additional capture surfaces reusing the same two intents | **V2-07**, after core capture; photo-library import does not require a share extension |
| Actionable budget guidance (§7.7) | Monthly budget/remaining amount, trends, month comparison and session variance | Budget pace, planning alerts and comparisons of genuinely similar shops | Later financial layer; existing budget displays are not V2 additions |
| Usual-basket/product price history (§7.8) | Session totals and optional item estimates | Reliable item prices, identity, quantities and unit normalisation across purchases | Later, depends on **V2-01–02**; same import foundation, not a second receipt pipeline |
| Android and larger households (§7.6) | Two-member household model; iOS beta | Release/platform work and membership expansion where beta shows exclusion | Conditional access track, not required for the V2 capture loop |
| Retailer handoff, licensed prices, loyalty pricing, price alerts and affiliates (§7 Tranche C) | Shared shopping workflow; no verified retailer-basket integration | Separate retailer/data/commercial integrations | Retained as later opportunities; importing a screenshot is not retailer integration |
| Household subscription / Plus (§8) | Existing household product and free beta | Entitlements, packaging, billing and payment validation | Separate commercial track; no V2 paywall or pricing decision made here |

### Source evidence

- [Receipt action](../convex/vision.ts) returns an extracted total, not purchase
  lines; [capture](../app/scan-receipt.tsx) and
  [confirmation](../app/receipt-confirm.tsx) provide the current camera flow.
- [Session creation](../convex/sessions.ts) accepts an optional list, but
  `recordCompletedShop` in [restocks](../convex/restocks.ts) returns without a
  list and otherwise reads completed list items. Saving a standalone total
  therefore does not currently teach product memory.
- [Product memory](../lib/productMemory.ts) learns purchase intervals and
  normalises names. [Pantry aliases](../lib/pantryCatalogue.ts) explicitly serve
  visual grouping and must not be reused as identity-merge rules.
- [Restock engine](../lib/restockEngine.ts),
  [Quick check](../components/restocks/QuickCheckSection.tsx), and
  [notifications](../convex/notifications.ts) supply the existing review loop.
  [Notification fixes UAT](NOTIFICATION_FIXES_UAT.md) records integrated activity,
  registration and scheduled-shop changes, development validation and remaining
  real-delivery checks. It does not establish production rollout.
- [Spending](../app/(tabs)/analytics.tsx),
  [session history](../components/analytics/SessionHistoryCard.tsx), and
  [budget calculations](../lib/budget.ts) already cover basic spend feedback.

## 3. Core V2 backlog

### V2-01 — Capture and confirm a whole purchase

**Origin:** Existing line-item receipt capture plus the new screenshot and
standalone purchase-entry proposal.

- Accept a receipt photo or selected receipt/order images without requiring a
  pre-entered shopping list. Allow multiple screenshots for one shop.
- Extract item names, readable quantities/units, retailer and purchase date
  where supported. Keep unknown values unknown; make date assumptions visible.
- Present one editable preview and one confirmation action. Highlight uncertain
  fields; allow removal, correction and manual addition without retyping the
  whole shop. Spending totals remain optional.
- Distinguish an order/cart from received goods. An unfulfilled order must not
  reset restock timing; confirm received items and substitutions first.
- Preserve manual entry and retry paths when extraction fails. Cancelling the
  preview changes no shopping or product history.

**Acceptance:** A household can record a real shop without entering its products
first. Nothing becomes purchase evidence until confirmed. A failed total read
does not prevent confirming otherwise usable purchase items.

### V2-02 — Match products and prevent duplicate purchase evidence

**Origin:** Existing receipt matching/correction, expanded by the Jev brainstorm.

- Suggest household product matches for receipt abbreviations and alternate
  names; permit “new product / none of these”. Keep milk and oat milk distinct.
- Remember confirmed corrections within the household. Do not silently merge
  existing histories or use artwork aliases as product identity.
- Offer suitable categories for unfamiliar products; classification must not
  imply that two products are the same.
- Reconcile overlapping screenshots, repeated uploads, both members recording
  the same shop, and receipts for an already-completed list. Offer linking to an
  existing purchase when uncertain; do not discard a genuine repeat purchase.
- Preserve receipt quantity separately from observation count: two packs in one
  shop are one purchase observation, not two shopping cycles.

**Acceptance:** Retries and confirmed duplicate imports do not duplicate spend,
purchase observations or reminders. A correction is reviewable and does not
silently change another household's matching.

### V2-03 — Learn from imports through the existing restock system

**Origin:** Existing prepared-shop and pre-shop-ritual opportunities, connected
to the new purchase sources.

- Feed confirmed imported purchases into the same household product history
  used by completed lists. Support standalone purchases without inventing a
  shopping list for the user to maintain.
- Preserve learning, tracked and paused states. One purchase is not automatic
  approval for reminders; retain explicit household control of tracked regulars.
- Use the confirmed purchase date, not upload time. Older receipt imports must
  not move the latest purchase backwards or fabricate a short purchase interval.
- Show suggested reconciliation with the active list in the preview. Confirm
  matched bought items without archiving unrelated items or the whole list.
- Reuse cadence learning and **Add**, **Still have some**, **Not this time** and
  **Stop tracking**. Start with editable defaults when history is sparse.
- Keep quantities as useful evidence, but defer quantity-sensitive depletion
  models. Household size and an AI estimate are not proof of consumption.
- Recalculate relevant reminders after confirmation, and suppress resolved or
  duplicate work using the existing notification contract.

**Acceptance:** A confirmed import updates the next eligible restock review;
an unconfirmed order does not. Tracked preferences survive imports. Recording
the same shop through two paths does not teach the engine twice.

### V2-04 — Free-form text for needs and purchases

**Origin:** Existing natural-language capture plus the Amy interaction reference.

- Let users type or paste several items naturally, including quantities where
  supplied, then quickly review editable items.
- **We need…** adds to Next shop; **We bought…** records a confirmed purchase
  through V2-01–03. Never infer a purchase from an ambiguous item-only phrase.
- Reuse product matching and preview components, with only the fields needed
  for each intent. Avoid introducing a conversational assistant for routine entry.
- Preserve immediate single-item and offline list entry. Parsing or provider
  availability must not block the current shopping workflow.

**Acceptance:** A batch can be added without opening one form per item, with
clear destination and corrections. Needs do not update purchase history.

## 4. Supporting scope and retained follow-ons

These remain in the backlog, but do not block the first receipt-to-restock beta.

| ID / opportunity | Scope and dependency | Promotion gate |
| --- | --- | --- |
| **V2-05: Factual completion recap** | Reuse session/spending data; show what was recorded and what needs review. Claim “remembered by OurPantry” only with reliable suggestion attribution; imported items alone do not establish that claim. | Core capture works; users need clearer evidence of its benefit |
| **V2-06: Household handoff** | Shopping-started prompt from the original strategy. Grouped list-update and completion pushes are already implemented with separate household-activity consent; reuse them and finish their UAT. | Beta shows a remaining coordination gap; define deduplication and cancellation before adding the started kind |
| **V2-07: Capture outside the app** | Share extension for receipt/order images or text, then select widgets, Siri/App Intents, quick actions or frequent-product shortcuts. Retailer links/recipes require their own supported-input decision. | Core input paths are reliable; evidence identifies which surface removes the most effort |
| Incomplete-shop recovery / missing-spend follow-up | Reuse existing completion and optional-total flows; in-app first, honour intentional skipping. | Observed forgotten completion or spend materially damages usefulness |
| Household-joined notification | Separate transactional activation aid from shopping handoffs. | Inviter misses joining/setup often enough to justify it |
| Budget pace and similar-shop comparison | Extend existing Spending; do not reimplement budgets or totals. | Enough representative spend history and evidence of actionable value |
| Personal product / usual-basket price history | Uses the import and identity foundation; adds verified line prices, pack/unit comparisons and uncertainty. | Accurate repeated price observations, not merely successful product extraction |
| Price-change digest / meaningful price drop | Personal digest depends on reliable history; market-wide drop alerts also require licensed/current data. | Useful changes clear confidence and notification-volume gates |
| Android / more household members | Independent access track, promoted if beta households are blocked. | Measured exclusion; not assumed to fit the core V2 delivery scope |
| Subscription and lifecycle messaging | Retain household subscription and pricing hypotheses in the strategy. | Retention/payment evidence and actual capture costs; no new free/paid limits decided |
| Retailer basket handoff / loyalty / affiliates / licensed comparisons | Preserve original later-stage opportunities and unbiased ranking requirements. | Separate data, partner and operational feasibility work |

Exact inventory, expiry/shelf-life prediction, consumption logging, meal logging,
recipes/meal planning, autonomous purchasing and a persistent chatbot remain
outside the proposed V2. Restock estimates must not be presented as food-safety
or expiry advice.

## 5. AI responsibilities

Jev is a candidate for bounded matching and categorisation, not a committed
dependency or the product promise. Compare it with deterministic aliases using
labelled household examples before choosing a provider.

The [previous Jev research](thread://01a0bde1-af04-7112-856a-c1179e96879c?hostId=local)
and TypeSafe documentation reviewed during this discussion indicate text-only
input and structured decisions. Image-to-text/line-item extraction and free-form
text parsing need their own implementation; Jev should not be assumed to supply
them. Keep dates, arithmetic and cadence updates in code. An initial AI-selected
restock category/default can be evaluated later, but precise depletion prediction
is not a V2 prerequisite.

Before production use, the implementation brief should cover provider accuracy,
latency/cost, minimal household data sent, receipt retention/deletion, and failure
behaviour. Evaluate UK receipt abbreviations, household staples including Nigerian
ingredients, ambiguous variants and deliberate non-matches. No provider has been
benchmarked for this V2 flow yet.

References: [Amy's input concept](https://www.amyfoodjournal.com/),
[Jev models](https://docs.typesafe.ai/models),
[structured decisions](https://docs.typesafe.ai/introduction),
[numeric/date limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

## 6. Delivery sequence and validation

1. **Protect the V1 baseline.** Complete remaining UAT for integrated registration,
   grouped household activity, shop-completion and scheduled-shop reminder fixes.
   These are existing maintenance work, not new V2 feature implementations.
2. **Build one complete purchase loop:** V2-01 + V2-02 + V2-03, initially using a
   declared small set of representative UK receipts and order screenshots. Test
   matching/extraction on examples before expanding retailer coverage.
3. **Add free-form capture:** V2-04 reuses that loop and existing list operations.
   This completes the proposed core V2 scope.
4. **Promote supporting features selectively:** V2-05–07 only when evidence and
   capacity justify them. Financial, access and commercial tracks retain their
   own gates rather than silently joining the core release.

Measure reduction in household work, not upload volume:

- correction effort and time to confirm a normal shop versus manual entry;
- proportion of attempted imports confirmed or abandoned, by input type;
- households recording their next distinct shop through capture;
- subsequent restock decisions and three-cycle retention;
- incorrect matches, duplicate observations/spend, stale reminders and opt-outs;
- household reports of less remembering and fewer forgotten items; and
- extraction/matching latency and cost per confirmed shop.

Use the existing consent and data boundaries in the
[measurement plan](ANALYTICS_MEASUREMENT_PLAN.md). Define bucketed capture source,
duration, correction and failure properties before instrumentation. Do not send
receipt text, product names or raw images to analytics. Count a confirmed imported
shop as the same underlying purchase as list completion; draft imports and
duplicate uploads must not inflate retention or completed-shop metrics. Compare
cycle-based results alongside the existing weekly metric for fortnightly shoppers.

The first beta must demonstrate a complete import-to-review journey with less
effort than entering the same shop manually. Set numerical product targets after
measuring the manual baseline; duplicate purchase evidence and unconfirmed-order
learning are correctness failures, not acceptable improvements in upload metrics.

Next planning artifact: a focused implementation brief for V2-01–03 covering
preview states, purchase identity, corrections, list reconciliation, history
compatibility, offline/failure behaviour and validation. Schema, dependencies and
other implementation decisions follow the repository's existing checkpoints;
this document changes no runtime behaviour or production services.
