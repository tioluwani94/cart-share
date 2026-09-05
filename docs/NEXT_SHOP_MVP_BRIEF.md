# Next Shop MVP — Product, UX, and Engineering Brief

Status: **Core MVP implemented; release hardening and closed-beta validation in progress**
Application code changed: **Yes**
Schema changed: **Yes — approved additive fields, tables, and indexes**
Navigation changed: **Yes — approved Plan / Shop / Pantry / Spending structure**

## 1. Feature summary

Next Shop pivots Our Pantry from a collection of manually maintained shopping lists into a household grocery memory. It learns a small set of recurring household products, reviews likely restocks at the right time, and prepares one upcoming shop for fast physical shopping or a lightweight online handoff. The product launches in the UK first while storing explicit market, currency, locale, and time-zone context for later expansion.

The initial release validates the cognitive-load proposition without AI, autonomous purchasing, retailer automation, exact pantry quantities, or broader household membership changes. It includes a deliberately bounded push-notification loop and privacy-conscious product analytics from the closed beta.

## 2. Primary user action

The primary action is to review a short set of uncertain restock suggestions and turn them into a trustworthy upcoming shop with minimal thought.

Every suggestion must answer three questions at a glance:

1. What product is this?
2. Why is it being suggested now?
3. What are my immediate choices?

## 3. Confirmed design direction

- **Register:** Product interface.
- **Platform:** Adaptive React Native/Expo, iOS first and Android later.
- **Colour strategy:** Restrained; coral is used for the primary action and selection, not decoration.
- **Scene:** A busy household planner opens the app one-handed in a bright kitchen or supermarket aisle, wanting reassurance and the next action within seconds.
- **Anchors:** Apple Reminders for familiarity, Things for calm hierarchy, and Monzo for approachable financial clarity.
- **Anti-goals:** Cartoonish gamification, dashboard clutter, prompt-first AI, exact inventory administration, and opaque automation.

## 4. MVP scope

### Included

- A household-level Next shop.
- A short activation flow for shopping cadence, preferred mode, and recurring products.
- The number of people the household normally shops for as a cold-start input.
- Manually selected or history-suggested recurring household products.
- Deterministic restock timing.
- Add, Still have some, Not this time, and Stop tracking decisions.
- Duplicate-safe addition to the active list.
- Physical shopping mode using the existing offline-capable item operations.
- A lightweight online handoff: review, copy/share the list, and open the chosen retailer where supported. No automated basket creation is promised.
- Completion of a shop with or without a receipt.
- Learning from completed products after a shopping session is saved.
- Existing budgets, planned totals, receipts, and spending history.
- One restock-review push plus at most one reminder per shopping cycle.
- Explicit PostHog product events for the closed beta, hosted in PostHog Cloud EU.
- UK launch defaults with market-aware household metadata.

### Explicitly deferred

- Autonomous ordering, Stripe agentic commerce, or payment execution.
- Retailer scraping, browser automation, or credential handling.
- AI-generated predictions or a persistent conversational agent.
- Exact pantry stock counts, expiry tracking, or consumption logging.
- Line-item receipt OCR beyond approved future work.
- Recipes, meal planning, price comparison, loyalty cards, or inventory scanning.
- Expansion beyond the existing two-member household limit.
- US-specific units, copy, retailer logic, receipt parsing, or go-to-market work.

Research hypotheses and sequencing for these and other future opportunities are
maintained in
[`POST_MVP_PRODUCT_AND_MONETISATION.md`](POST_MVP_PRODUCT_AND_MONETISATION.md).
That strategy does not expand the approved MVP scope.

## 5. Information architecture proposal

This navigation structure was approved in checkpoint A and is implemented.

### Primary tabs

| Destination  | Purpose                                                          | Existing capability reused             |
| ------------ | ---------------------------------------------------------------- | -------------------------------------- |
| **Plan**     | Next-shop summary, restock review, planned products, other lists | Existing Home and list queries         |
| **Shop**     | Direct access to the active list and in-store mode               | Existing list detail and offline queue |
| **Spending** | Monthly budget, planned versus actual, recent shops              | Existing Analytics and sessions        |

### Secondary routes

- Household settings opens from the profile/avatar control and is hidden from the tab bar.
- Other and archived lists remain accessible from Plan.
- Receipt capture and confirmation remain focused stack routes.
- Product tracking preferences open as a nested Plan/settings route, not another tab.

### Implemented file-level structure

- `app/(tabs)/index.tsx` is Plan.
- `app/(tabs)/shop.tsx` presents the active shop.
- `app/(tabs)/analytics.tsx` keeps its route and displays the label Spending.
- Settings is a hidden stack route opened from avatar controls rather than a visible tab.
- `lib/useShoppingList.ts` and the list modules share shopping-list behaviour between the Shop tab and list detail.

## 6. Core flow

```text
Household activation
        ↓
Choose or confirm recurring products
        ↓
Restock engine calculates products due near the next shop
        ↓
Household reviews a small batch
        ↓
Approved products are merged into the active list
        ↓
Physical shop or online handoff
        ↓
Finish shop, optionally capture receipt and spend
        ↓
All completed products extend household grocery memory; confirmed products update their cadence
```

## 7. Low-fidelity wireframes

These wireframes define structure and behaviour, not final spacing, type, or illustration.

### State A — Household activation

```text
┌─────────────────────────────────────┐
│ Set up your grocery rhythm       1/4│
│                                     │
│ How many people do you usually      │
│ buy groceries for?                  │
│            [ − ]  4  [ + ]          │
│                                     │
│ How often do you usually shop?      │
│                                     │
│ ● Every week                        │
│ ○ Every two weeks                   │
│ ○ Monthly                           │
│ ○ It varies                         │
│                                     │
│ How do you usually shop?            │
│ [ In store ] [ Online ] [ Both ]    │
│                                     │
│                         [Continue]  │
└─────────────────────────────────────┘
```

The next steps suggest recurring products from existing history and starter categories, establish or choose the Next shop, and reveal the first useful review. Users can select as few as three recurring products and skip any suggestion. Exact quantities are optional. Notification permission is requested only after this first-value moment; analytics consent is optional and never blocks activation.

### State B — Plan / Next shop

```text
┌─────────────────────────────────────┐
│ Plan                         (avatar)│
│                                     │
│ Next shop · Saturday                │
│ 12 items · about £43                │
│ [Review list]       [Start shopping]│
│                                     │
│ Needs a quick check              3  │
│ Milk                                │
│ Usually bought every 7 days         │
│ [Add] [Still have some] [Not now]   │
│ ─────────────────────────────────── │
│ Bread                               │
│ Last bought 5 days ago              │
│ [Add] [Still have some] [Not now]   │
│                                     │
│ Already planned                 12 ›│
│ Other lists                      2 ›│
│                                     │
│ Plan      Shop      Pantry  Spending │
└─────────────────────────────────────┘
```

Only a small number of suggestions are expanded. Additional candidates sit behind “Review all.” If there are no candidates, the screen reassures the household that the plan is up to date.

### State C — Restock review

```text
┌─────────────────────────────────────┐
│ ‹ Plan          Review restocks     │
│                                     │
│ 3 things may need attention         │
│ You can change these at any time.   │
│                                     │
│ Milk                                │
│ Usually 2 bottles every 7 days      │
│ Last bought Sun 24 Aug              │
│ [ Add to shop ]                     │
│ [ Still have some ]   [ Not now ]   │
│                                     │
│ Bread                               │
│ Usually bought every 5 days         │
│ [ Add to shop ]                     │
│ [ Still have some ]   [ Not now ]   │
│                                     │
│                         [Done]      │
└─────────────────────────────────────┘
```

“Why this?” reveals the underlying dates and cadence, never an invented explanation. Stop tracking is available from the product's overflow/context action to keep the main row calm.

### State D — Active physical shop

```text
┌─────────────────────────────────────┐
│ Shop · Saturday             4 of 12 │
│ £18 planned of £55 budget           │
│ ███████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                     │
│ + Add an item                       │
│                                     │
│ Produce                             │
│ ○ Bananas                  6         │
│ ○ Apples                   1 bag     │
│                                     │
│ Dairy                               │
│ ● Milk                     2         │
│ ○ Yoghurt                  4 pack    │
│                                     │
│ Pantry                              │
│ ● Pasta                    500 g     │
│                                     │
│                       [Finish shop] │
│ Plan      Shop      Pantry  Spending │
└─────────────────────────────────────┘
```

Rows are flat and category-grouped. Completion uses a check transition and haptic only. Pending offline operations have a non-blocking sync state. “Finish shop” remains disabled only while a required local mutation is unresolved; a receipt is not required.

### State E — Finish and learn

```text
┌─────────────────────────────────────┐
│ Shop complete                       │
│                                     │
│ 11 products purchased               │
│ 1 product left on the list          │
│                                     │
│ Add what you spent?                 │
│ [Scan receipt]  [Enter total]        │
│ [Skip for now]                      │
│                                     │
│ We'll use purchased recurring       │
│ products to prepare the next shop.  │
│                                     │
│                       [Finish]      │
└─────────────────────────────────────┘
```

The list is archived only after a shopping session is saved. “Skip for now” creates a valid session without financial data; it does not write a fake £0 total. Receipt cancellation leaves the finish screen and list usable.

## 8. Exact MVP behaviour

### 8.1 Activation

- Activation occurs after the household exists, not inside Clerk authentication.
- “Household activation” means product onboarding after account and household creation. It is separate from authentication and invitation.
- A household completes activation once; both members share the result.
- It should take less than 90 seconds, preserve in-progress choices when navigating back, and never require a complete pantry inventory. The four short steps are required before entering the main app.
- Ask “How many people do you usually buy groceries for?” rather than “family size.” Accept 1–20 and explain that this only improves the starting plan.
- The user chooses shopping mode and an approximate cadence: 7, 14, 30 days, or variable.
- Existing repeated list items may be suggested as recurring products.
- A suggestion is not tracked until the user explicitly selects it.
- The household chooses an existing unarchived list as Next shop or creates a new one. Existing lists are never merged or archived automatically.
- The activation success state is the first useful Next shop or restock review, not a generic completion screen.
- `peopleServed` is a cold-start prior for starter suggestions and sensible quantities for scalable staples. It must not directly multiply cadence or claim to predict consumption. Purchase history and explicit corrections supersede it as evidence accumulates.
- After the first useful plan is visible, show an in-app explanation of notification value and then the operating-system permission prompt. Denial is respected without repeated prompting.
- Analytics consent is a separate, optional beta choice shown after the first
  useful plan is ready. Declining continues into the app normally, absence or
  dismissal means no analytics collection, and the choice remains editable in
  Settings.

### 8.2 Initial cadence

- Two or more historical purchases: use the median interval between the most recent valid purchases, clamped to 1–180 days.
- One historical purchase: ask the user to accept or change a category default.
- No history: use the user's chosen interval or a category default that is visibly editable.
- The engine records how many actual purchase observations support the cadence.

### 8.3 Candidate calculation

For an active household product:

```text
expectedDueAt = lastPurchasedAt + cadenceDays
baseReviewAt = expectedDueAt - clamp(cadenceDays × 0.2, 1 day, 3 days)
effectiveReviewAt = reviewAfter ?? baseReviewAt
reviewWindowEnd = nextPlannedShopAt + 1 day
candidate = effectiveReviewAt <= now AND expectedDueAt <= reviewWindowEnd
```

If no next-shop date exists, use `now + min(shoppingCadenceDays, 7 days)` as the review horizon. Products without a purchase date use their activation date as the initial purchase anchor. `reviewAfter` is an optional override used only for household postponements; ordinary review timing is derived rather than persisted.

Candidates are sorted by overdue duration, then confidence, then display name. The initial Plan screen expands at most three candidates.

### 8.4 Decisions

| Decision            | Immediate effect                                    | Learning effect                             |
| ------------------- | --------------------------------------------------- | ------------------------------------------- |
| **Add**             | Upsert linked item into active list                 | None until purchased                        |
| **Still have some** | Delay review by 25% of cadence, clamped to 2–7 days | Increase cadence by 10%, capped at 180 days |
| **Not this time**   | Delay until one day after the current planned shop  | Do not change cadence                       |
| **Stop tracking**   | Set product status to paused                        | Preserve history for restoration            |

Every decision is idempotent. Repeating Add must not create duplicate list items.

### 8.5 Duplicate semantics

- A linked `householdProductId` is the primary identity.
- When importing an unlinked existing item, normalized name plus list acts as the fallback identity.
- Add merges into the existing incomplete item. It does not silently change a user-edited quantity, notes, or estimated price.
- A completed instance on the current list does not block adding a new instance only after the user explicitly requests it.

### 8.6 Completing a shop

- The household explicitly taps Finish shop.
- Completed items count as purchased; incomplete items do not.
- A shopping session and list archival happen in the same Convex transaction.
- The total, store, paid-by source, and receipt are optional at completion.
- Receipt capture can enrich the session before completion or later.
- Cancelling receipt capture does not archive or mutate the list.

### 8.7 Learning after purchase

Every completed shopping session records at most one purchase observation for
each normalized product, including manually added products that were not chosen
during activation. Exact normalized-name matching is used for the MVP; fuzzy or
AI identity matching is explicitly excluded.

An unknown completed product starts in `learning` state after its first distinct
shop. After two distinct shopping-session observations it becomes a **possible
regular**, but it is not eligible for restock reminders until a household member
explicitly chooses **Track this product**. **Not a regular** moves it to `paused`
without deleting its history.

For each completed item linked to an active or learning household product:

```text
observedInterval = purchasedAt - previousLastPurchasedAt
newCadence = round((oldCadence × 0.7) + (observedInterval × 0.3))
```

Observed intervals are clamped to 1–180 days. The first purchase only establishes
`lastPurchasedAt`; it does not pretend to be a learned interval. Duplicate list
lines and completion retries do not increase evidence. After updating, any
`reviewAfter` postponement is cleared so the next review returns to the derived
cadence window. Paused products retain history but remain excluded from review.

### 8.8 Offline behaviour

- Existing user-and-household-scoped offline item operations remain the source of truth for add, toggle, edit, and delete.
- Restock decisions made offline queue an absolute desired state and remain scoped to the signed-in user and household.
- Add uses a stable client operation ID and product identity so replay is idempotent.
- Finish shop is available offline only if it can enqueue one atomic completion command containing the list snapshot and stable client ID. Otherwise the UI explains that completion will be available after reconnecting while ordinary list work continues.
- This checkpoint-C extension is implemented: Finish shop queues one scoped,
  stable snapshot command behind item writes and replays it idempotently as a
  single Convex completion transaction.
- Item changes made while replay is already in flight remain queued behind that
  replay, so a late delete cannot resurrect an offline-created item.
- If another household member deletes a snapshotted item before completion
  replays, the missing item is skipped and the remaining snapshot can finish.

### 8.9 Trust and copy rules

- Say “may need,” “usually bought,” or “last bought.” Never say an item is definitely running out.
- Show the data behind Why this; do not generate a human-sounding fictional reason.
- Do not display numerical confidence to consumers in the MVP.
- A user can edit cadence, quantity, unit, category, and tracking status at any time.

### 8.10 Push-notification behaviour

- Notifications are a private route back to an existing review, never an
  automatic product decision.
- Send one consolidated restock-review notification when a household has unresolved candidates. A second notification is allowed only as a reminder roughly 24 hours before the planned shop while candidates remain unresolved.
- Cap delivery at two push notifications per household shopping cycle. Never send one notification per product.
- Default delivery is 18:00 in each member's saved time zone, with quiet hours from 20:00–08:00. Each member can disable or adjust their own notifications without changing the other member's preference.
- Keep lock-screen copy private by default: “3 things may need a quick check before Saturday.” Do not include product names, spend, household names, or receipt data.
- A notification deep-links to the Plan restock-review state. If another member has already resolved the review, opening it shows the current, completed state rather than stale actions.
- Before sending, the backend revalidates household membership, the recipient's preference, and the unresolved-candidate count. Sign-out disables that device token for the signed-out user.
- Expo delivery tickets and receipts are processed. Permanently invalid tokens are disabled; transient failures are retried with bounded backoff and no duplicate user-visible reminder.
- A backend job evaluates pending reminders at a fixed interval. Product, list-date, membership, preference, and restock-decision mutations recalculate or cancel the affected reminder record.
- When a completed shop moves one or more learning products across the second
  distinct-observation threshold, schedule one consolidated possible-regular
  notification per opted-in member for that session. Do not notify after the
  first purchase, once per product, during historical backfill, or again on a
  completion retry.
- The learning notification deep-links to the learning section of Tracked
  products. Send-time validation removes products already tracked or rejected
  and cancels delivery when no qualifying product remains.

### 8.11 Product analytics behaviour

- Use PostHog Cloud EU for the closed beta, behind an internal analytics module rather than calling the SDK from screens.
- Start with explicit, allow-listed events only. Disable touch autocapture, automatic screen capture, session replay, and IP-based geolocation. App lifecycle events may remain enabled.
- Configure analytics as opt-in. After activation's first-value moment, offer a
  skippable consent choice that names the excluded data categories. Before
  consent, use the no-op adapter and do not queue product events. Consent can be
  changed in Settings.
- After consent, identify with opaque internal user and household IDs. These identifiers remain pseudonymous personal data and must be disclosed; never send names, email addresses, invite codes, product names, notes, receipt images/OCR, exact spend, budgets, or retailer credentials.
- On sign-out, flush only the current user's already-consented events, then call the analytics reset and replace the client with the no-op adapter. A subsequent user must never inherit the previous user's distinct ID or queued events.
- Do not depend on PostHog's paid Group Analytics for the beta. Include an opaque `household_id` property on the allow-listed events so household-level beta behaviour can be analysed on the free product-analytics tier.

Initial event contract:

| Event                              | Safe properties                                        |
| ---------------------------------- | ------------------------------------------------------ |
| `activation started`               | market, platform, app version                          |
| `activation completed`             | household-size bucket, cadence bucket, shopping mode   |
| `activation skipped`               | step identifier                                        |
| `notification permission answered` | granted/denied/provisional                             |
| `restock review shown`             | candidate-count bucket, source                         |
| `restock decision made`            | add/still-have/not-now/stop-tracking, source           |
| `shopping list created`            | activation/plan source                                 |
| `shopping item added`              | active-shop/list-detail/restock source                 |
| `shop planned`                     | lead-time bucket                                       |
| `shop started`                     | physical/online                                        |
| `shop completed`                   | item-count bucket, total-present, receipt-present      |
| `receipt attached`                 | source camera/library                                  |
| `notification scheduled`           | restock-review/shop-reminder/product-learning          |
| `notification sent`                | kind, delivery result                                  |
| `notification opened`              | kind                                                   |
| `possible regular reviewed`        | track/not-regular decision, pantry/notification source |
| `tracked product corrected`        | field category only                                    |
| `household invite shared`          | settings source                                        |
| `household member joined`          | invite-code source                                     |
| `tab viewed`                       | Plan/Shop/Pantry/Spending only                         |

Event names use the `[object] [verb]` convention and live in one typed contract. Adding an event or property requires updating the allow-list and its privacy review.

### 8.12 Market strategy and localisation seam

- Launch and recruit the first households in the UK. The beta promise, receipt fixtures, currency, date copy, units, retailer examples, and support material are UK-specific.
- Do not show a country selector during the UK beta. Seed GB/GBP/en-GB and confirm the device time zone when activation runs.
- Store the household's market, currency, locale, and planning time zone explicitly. Device settings are a starting value, not the permanent source of truth.
- All UI money and date output crosses the shared formatting module. Restock calculations use saved time-zone-aware day boundaries rather than the device's current zone.
- Receipt extraction crosses a market adapter such as `parseReceipt(text, { market: "GB" })`. Only the tested GB adapter ships initially; unsupported markets fail clearly instead of silently applying UK rules.
- Store and product data must not hard-code Tesco or any other retailer into the domain model. Retailers are user-entered or supplied by a market catalogue adapter.
- Keep existing pence-named storage during the UK beta to avoid an unrelated migration. Expose currency-neutral `Money` values at module boundaries. Before a second currency launches, perform a planned dual-read/backfill migration to `*Minor` field names and test mixed-version clients.

## 9. Implemented schema and indexes

Sections 9.1–9.5 were approved in checkpoint B. Sections 9.6–9.8 and the
additional household fields were approved in checkpoint G. All are implemented.
The account-deletion field/index changes in checkpoint J are also implemented
locally and documented in `docs/RELEASE_READINESS.md`.

### 9.1 New table: `householdProducts`

```ts
householdProducts: defineTable({
  householdId: v.id("households"),
  displayName: v.string(),
  normalizedName: v.string(),
  category: v.optional(v.string()),
  defaultQuantity: v.optional(v.number()),
  defaultUnit: v.optional(v.string()),
  cadenceDays: v.number(),
  lastPurchasedAt: v.optional(v.number()),
  reviewAfter: v.optional(v.number()),
  purchaseObservationCount: v.number(),
  status: v.union(
    v.literal("learning"),
    v.literal("active"),
    v.literal("paused"),
  ),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_household_and_status", ["householdId", "status"])
  .index("by_household_and_normalized_name", ["householdId", "normalizedName"]);
```

Rationale:

- It models replenishment memory, not physical stock.
- The household-and-status index serves active review.
- The normalized-name index prevents duplicate tracked products.
- `learning` preserves the boundary between observed purchase memory and an
  explicitly approved reminder.
- No due-date index is initially required because a household is expected to have tens, not thousands, of tracked products; the authenticated household query can calculate candidates in memory.

### 9.2 `households` additions

```ts
activeListId: v.optional(v.id("lists")),
shoppingCadenceDays: v.optional(v.number()),
peopleServed: v.optional(v.number()),
preferredShoppingMode: v.optional(
  v.union(
    v.literal("in_store"),
    v.literal("online"),
    v.literal("both"),
  ),
),
marketCountryCode: v.optional(v.string()),
currencyCode: v.optional(v.string()),
locale: v.optional(v.string()),
planningTimeZone: v.optional(v.string()),
restockSetupCompletedAt: v.optional(v.number()),
```

- `activeListId` identifies Next shop without redefining all existing lists.
- `shoppingCadenceDays` is absent for “it varies.”
- `peopleServed` is validated as an integer from 1–20 and is only a cold-start planning input.
- The four market fields are written as GB, GBP, en-GB, and a confirmed IANA time-zone identifier for the UK beta. They remain strings so a later market can be added without another discriminator migration.
- `restockSetupCompletedAt` distinguishes an intentionally empty setup from an unactivated household.

### 9.3 `lists` additions

```ts
plannedFor: v.optional(v.number()),
shoppingMode: v.optional(
  v.union(v.literal("in_store"), v.literal("online")),
),
```

These fields describe a particular shop and may override household defaults.

### 9.4 `items` addition

```ts
householdProductId: v.optional(v.id("householdProducts")),
```

The link provides stable product identity across product renames and repeated shops. No new item index is required for the MVP because item access remains list-scoped.

### 9.5 `shoppingSessions` adjustment

Change:

```ts
totalAmount: v.number();
```

to:

```ts
totalAmount: v.optional(v.number());
```

This allows a household to complete a valid physical shop without being forced to scan a receipt or enter spending. Analytics must exclude missing totals from sums while still counting the shopping session where appropriate.

Offline completion additionally stores an approved idempotency key:

```ts
completionOperationId: v.optional(v.string())

  .index("by_list_and_completion_operation", [
    "listId",
    "completionOperationId",
  ]);
```

The field is present only for queued completion commands. It keeps retries
idempotent without treating every future completion of the same list as the
same shopping session.

### 9.5.1 New table: `productPurchaseObservations`

```ts
productPurchaseObservations: defineTable({
  householdId: v.id("households"),
  householdProductId: v.id("householdProducts"),
  shoppingSessionId: v.id("shoppingSessions"),
  sourceItemId: v.optional(v.id("items")),
  purchasedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_product_and_session", ["householdProductId", "shoppingSessionId"])
  .index("by_household_and_date", ["householdId", "purchasedAt"]);
```

The product/session index is the durable retry guard and ensures duplicate list
lines contribute one piece of evidence per completed shop.

### 9.6 New table: `userPreferences`

```ts
userPreferences: defineTable({
  userId: v.id("users"),
  analyticsConsent: v.optional(
    v.union(v.literal("granted"), v.literal("denied")),
  ),
  analyticsConsentUpdatedAt: v.optional(v.number()),
  restockNotificationsEnabled: v.boolean(),
  notificationTimeMinutesLocal: v.number(),
  notificationTimeZone: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"]);
```

The preference is per person, not per household. Missing analytics consent is treated as not granted. Notification time defaults to 18:00 only after notification opt-in.

### 9.7 New table: `pushTokens`

```ts
pushTokens: defineTable({
  userId: v.id("users"),
  token: v.string(),
  platform: v.union(v.literal("ios"), v.literal("android")),
  deviceId: v.optional(v.string()),
  lastSeenAt: v.number(),
  disabledAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_token", ["token"]);
```

Registration is authenticated. A token can be rebound only after explicit sign-in on that device; sign-out disables the current binding, and send-time authorization prevents stale household delivery.

### 9.8 New table: `notificationReminders`

```ts
notificationReminders: defineTable({
  userId: v.id("users"),
  householdId: v.id("households"),
  kind: v.union(
    v.literal("restock_review"),
    v.literal("shop_reminder"),
    v.literal("product_learning"),
  ),
  productIds: v.optional(v.array(v.id("householdProducts"))),
  scheduledFor: v.number(),
  dedupeKey: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("cancelled"),
    v.literal("failed"),
  ),
  expoTicketId: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_status_and_scheduled_for", ["status", "scheduledFor"])
  .index("by_dedupe_key", ["dedupeKey"])
  .index("by_user", ["userId"]);
```

Restock `dedupeKey` values combine user, household, shopping cycle, and reminder
kind. Product-learning keys combine user, household, completed session, and
kind. `productIds` is used only for send-time state validation; lock-screen copy
never contains the names.

## 10. Migration and backfill behaviour

- All additions are optional or live in a new table; existing household, list, item, receipt, and session documents remain valid.
- Existing session totals remain unchanged.
- Existing sessions leave `completionOperationId` absent; no idempotency-key
  backfill is required.
- No automatic production backfill runs at schema deployment. An approved,
  bounded internal migration can process historical sessions in cursor batches.
  It is idempotent, creates no historical notifications, preserves explicit
  active/paused choices and cadence, and links normalized completed items to
  household products.
- Existing households see a one-time activation experience after sign-in because `restockSetupCompletedAt` is absent.
- Existing households receive GB/GBP/en-GB defaults only when activation is saved; no speculative data backfill runs. Their time zone is seeded from the activating device and explicitly confirmed.
- Activation queries recent archived/completed list history, normalizes names, and offers repeated products for confirmation.
- The user chooses which existing list becomes `activeListId`; if none exists, the app creates a new Next shop list.
- Existing unarchived lists remain under Other lists and are never merged, renamed, or archived automatically.
- An accepted historical product is seeded with the latest completed date and median interval where sufficient observations exist.
- Declined history suggestions leave no new document behind.
- Rollback is additive: the old list, receipt, session, and analytics screens can ignore every new optional field and the new table.
- Existing users have no analytics consent and notifications disabled until they choose otherwise. No device token is registered before the notification permission flow.

## 11. Restock module interface

The replenishment implementation should form one deep module. Screens and tests cross the same interface; prediction details remain internal.

### Client-visible Convex interface

```ts
restocks.getReview({});
restocks.decide({ householdProductId, decision, operationId });
restocks.updateProduct({ householdProductId, changes });
```

`getReview` returns the active list summary, at most the requested candidate page, and plain-language reason data. `decide` authenticates membership, applies the decision, and atomically upserts an item when required. `updateProduct` supports explicit household corrections.

### Internal interface

```ts
restocks.recordCompletedShop({ sessionId })
restocks.backfillProductMemory({ cursor?, batchSize? })
```

Session creation calls `recordCompletedShop` internally in the same transaction.
It validates household ownership, learns from every completed product, and
deduplicates product/session observations. The backfill is an internal,
cursor-bounded operator function and never schedules historical notifications.

### Pure calculation seam

```ts
calculateRestockReview({ products, nextShopAt, now }): RestockCandidate[]
applyRestockDecision({ product, decision, nextShopAt, now }): ProductUpdate
learnFromPurchase({ product, purchasedAt }): ProductUpdate
```

These functions accept time and return results without I/O. Their interface is the deterministic test surface. AI product normalization, if introduced later, belongs behind a separate adapter because both a deterministic adapter and an AI adapter will then exist.

## 12. Required key states

| State                            | Required behaviour                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| First household activation       | Explain the benefit, require only the four short setup steps, and never require an exhaustive pantry |
| No tracked products              | Offer starter staples and history suggestions                                                        |
| No candidates due                | Reassure; provide next expected review and manual add                                                |
| No active list                   | Choose existing or create Next shop                                                                  |
| Candidate already on list        | Show Added; never duplicate                                                                          |
| All candidates reviewed          | Collapse review and foreground the shop                                                              |
| Offline with cached plan         | Shopping works; clearly show pending sync                                                            |
| Offline completion unsupported   | Preserve progress and explain reconnect requirement                                                  |
| Household member updates list    | Real-time update without interruptive toast storms                                                   |
| Receipt cancelled                | Return to usable finish flow; no archival                                                            |
| Session saved without total      | Archive safely; omit spend from monetary aggregates                                                  |
| Prediction is wrong              | One-tap correction changes future review timing                                                      |
| Product paused                   | Removed from review; restorable from Pantry                                                          |
| Notification permission denied   | Activation completes; Settings explains how to enable it without nagging                             |
| Push opens after review resolved | Show the current completed Plan state; do not resurrect decisions                                    |
| Signed-out device                | Disable its user-token binding and send nothing for the previous household                           |
| Analytics consent absent/denied  | No-op analytics adapter; no product events queued or sent                                            |
| Unsupported market               | Keep core lists usable and state that receipt extraction is not available for that market            |

## 13. Content requirements

### Preferred terminology

- Next shop
- Needs a quick check
- Usually bought every…
- Last bought…
- Add to shop
- Still have some
- Not this time
- Stop tracking
- Finish shop
- Skip receipt for now

### Avoid

- Inventory level
- Depletion probability
- Confidence score
- AI recommendation
- Autonomous agent
- Optimised replenishment
- We know you are running out

## 14. Test plan

### Pure restock engine

- Product becomes due before the next planned shop.
- Product outside the review window is absent.
- Variable-cadence household receives a bounded default horizon.
- Still have some postpones and lengthens cadence within clamps.
- Not this time does not change cadence.
- Stop tracking removes product from active review.
- Purchase learning uses the weighted interval and clamps outliers.
- Initial purchase does not manufacture a learned interval.
- Candidate sorting is deterministic.

### Convex interface

- Every query and mutation requires authentication and household membership.
- A member cannot read or alter another household's products.
- Add is idempotent by `operationId` and linked product identity.
- Add does not overwrite user-edited item fields.
- Shop completion, product learning, and archival are transactional.
- Duplicate lines and completion retries create one purchase observation per
  product/session.
- Historical backfill is cursor-bounded, idempotent, and notification-free.
- Missing session total is valid and excluded from spend sums.
- Existing sessions with totals produce unchanged analytics.

### Client flow

- Existing household activation preserves all current lists.
- User can choose an active list.
- Candidate decisions update optimistically and reconcile safely.
- Both household members see the same review and active list.
- Large text, screen reader, reduced motion, dark appearance, and long product names remain usable.
- Offline add, toggle, edit, delete, and reconnect remain correct.
- Sign-out cannot replay another user's restock decisions.
- Notification permission is requested only after the first useful plan is shown.
- Consolidated push opens the correct household review and cannot reveal product names on the lock screen.
- A second distinct purchase can schedule one consolidated learning push; a
  first purchase, retry, backfill, or already-reviewed product cannot.
- A resolved or cancelled review cancels its remaining reminder.
- Analytics emits only allow-listed events after consent and resets identity on sign-out.
- UK dates, pounds, receipt parsing, time-zone boundaries, and unit copy remain correct when the device travels.

### Notifications and analytics

- Reminder recalculation is idempotent across activation, product decisions, list-date changes, and retries.
- Send-time authorization rejects a removed member and a disabled preference.
- Expo receipt handling disables a permanently unregistered device token.
- Quiet hours and member-local delivery time work across daylight-saving transitions.
- Maximum two restock-planning notifications per shopping cycle is enforced
  server-side; learning adds at most one consolidated notification per
  qualifying completed session.
- The PostHog adapter is replaceable with a no-op test adapter.
- Event schemas reject prohibited free-text and exact financial properties.
- Consent grant, withdrawal, sign-out, and a second user signing into the same device are isolated.

## 15. Product validation

The first household beta should measure:

- Percentage of suggested products added, postponed, and rejected.
- Number of duplicate suggestions or obvious false positives.
- Time from opening Plan to a review-complete state.
- Percentage of shops completed without forgotten manually-added staples.
- Weekly household return rate.
- Activation completion and time to the first useful Next shop.
- Push delivery, open-to-review, and review-completion rates without treating opens as value by themselves.
- Three-cycle household retention, segmented only by safe buckets such as cadence, household size, and shopping mode.
- Qualitative response to: “Did this reduce how much you had to remember?”

The feature is promising when households return for at least three planning cycles, accept or meaningfully correct suggestions, and report that the app replaced a recurring memory task. Raw screen engagement is not sufficient evidence.

## 16. Approval checkpoints

Implementation must pause for explicit approval at each checkpoint required by `AGENT.md`:

Approved checkpoints; implementation status is summarised in section 17:

1. **A — Navigation:** Plan / Shop / Pantry / Spending tabs and hidden Settings route. Pantry is the sole persistent home for the household's learned and tracked products.
2. **B — Core restock schema and indexes:** `householdProducts` plus the previously proposed optional fields and two indexes.
3. **C — Offline strategy:** Restock-decision and atomic shop-completion queue semantics.
4. **D — Auth/activation placement:** Activation occurs after household setup; Clerk authentication is unchanged.
5. **E — Dependencies:** Add `expo-notifications`, `expo-constants`, `posthog-react-native`, `expo-file-system`, `expo-application`, `expo-device`, and `expo-localization`. Convex sends push messages directly to Expo's HTTP API; no server push SDK is added.
6. **F — Environment and native configuration:** Add `EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` for the client; `POSTHOG_API_KEY` and `POSTHOG_HOST` for consent-gated server events; configure `extra.eas.projectId`; and configure APNs/FCM credentials through EAS rather than source-controlled environment files.
7. **G — Additional schema and indexes:** Add `peopleServed` and market metadata to households; add `userPreferences`, `pushTokens`, and `notificationReminders`; add their six indexes exactly as shown in sections 9.6–9.8.
8. **H — Privacy and consent:** Use PostHog Cloud EU, explicit opt-in, the event/property allow-list, no session replay/autocapture/geolocation, generic push copy, per-member notification preferences, and identity reset/token disable on sign-out.
9. **I — Market strategy:** Launch UK-first without a country selector, keep the international seams in section 8.12, and defer the pence-to-minor-unit migration until a second currency is actually scheduled.

10. **J — Account deletion (approved and implemented locally):** Shared-household deletion, ownership transfer, bounded resumable attribution anonymisation, final-household cleanup, signed Clerk webhook handling, and digest tombstones that reject stale authenticated sessions.
11. **K — Production services (pending):** Approve creation/linking of the EAS project and any production Convex, Clerk, PostHog, APNs, or Google Vision configuration. Approval of the configuration design does not authorize a production deployment.

## 17. Implementation and release status

1. **Implemented:** stabilisation, deterministic restock engine, additive schema, authenticated Convex interface, activation, household inputs, historical suggestions, analytics consent, notification scheduling, scoped token lifecycle, account deletion, shared shopping-list modules, Plan, Shop, Pantry, Spending, Settings, UK defaults, and the approved visual direction.
2. **Locally verified:** TypeScript, lint, Jest, account-deletion invariants, iOS simulator flows, receipt cancellation, offline replay invariants, and analytics allow-list/identity isolation.
3. **Release hardening in progress:** the legal website, in-app legal links, privacy-manifest baseline, and App Store disclosure mapping are complete locally. Dependency alignment, external account-deletion verification, EAS project and credentials, production environment configuration, final archive privacy verification, and release-build permission audit remain.
4. **Physical-device validation pending:** Google and Apple production OAuth, APNs delivery and receipt cleanup, two-device household sync, real UK receipts, offline reconnect, accessibility, and consent/sign-out isolation.
5. **Beta pending:** run the closed UK household beta before adding AI or another market.
