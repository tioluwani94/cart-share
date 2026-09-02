# OurPantry Post-MVP Product and Monetisation Strategy

Status: **Strategy and validation hypotheses — not an implementation commitment**

Initial market: **UK households, iOS first**

Last updated: **2 September 2026**

## 1. Purpose

This document records the product opportunities, retention ideas, and
monetisation hypotheses that follow the Next Shop MVP. It should guide beta
research and future planning without expanding the MVP before its core value is
validated.

The central question is not whether people can make a shared grocery list. Free
products already solve that. The question is whether OurPantry can become a
trusted household grocery memory: something that reduces how much one person
must remember, keeps the household coordinated, and makes each next shop easier
than the last.

## 2. Strategic thesis

OurPantry should be positioned around this promise:

> Stop carrying the grocery list in your head. OurPantry remembers your
> regulars, keeps your household in sync, and prepares the next shop before you
> have to think about it.

The value proposition hierarchy is:

1. **Emotional promise:** reduce the household grocery mental load.
2. **Practical outcome:** fewer forgotten items, duplicate purchases, and
   repeated conversations.
3. **Supporting proof:** show what the household spends and how it is tracking
   against its plan.
4. **Long-term intelligence:** explain how the household's regular prices and
   usual basket change over time.

“Save money” can be a strong acquisition message, but it must not become a
product claim until OurPantry can show an attributable saving. Until then, use
defensible language such as “under budget”, “usually paid”, “price changed”,
“remembered”, and “prepared”.

## 3. Market signal summary

Desk research supports continuing to a closed paid beta, but it does not prove
product-market fit or willingness to pay for OurPantry specifically.

- The UK has approximately 29 million households, and 66.8% contain one family.
- UK spending on food and non-alcoholic drinks increased 5% nominally in the
  financial year ending 2025, with most of the increase caused by higher prices.
- An Ipsos survey found that 76% of respondents thought their grocery spending
  had increased over the previous year; 51% were buying more value-range
  products and 35% were using price-comparison sites more.
- Research on cognitive household labour supports the distinction between
  physically doing the shopping and carrying the work of anticipating,
  remembering, and coordinating it.
- Paid competitors demonstrate some category-level willingness to pay, but
  free shared lists and platform products such as Apple Reminders create a low
  price anchor.

This creates an opportunity, with an important constraint: **a shared list is a
commodity; a reliable household memory may not be.**

## 4. Initial customer focus

### Primary initial customer

A two-person UK household where:

- one person carries most of the grocery-planning responsibility;
- shopping happens on a weekly or fortnightly rhythm;
- both people need to contribute to or use the same shop;
- the current system is a note, text thread, whiteboard, memory, or generic
  reminder list; and
- forgotten staples, duplicate purchases, or repeated “do we need this?”
  conversations occur often enough to be frustrating.

Couples with young children and new parents may be especially strong early
segments because their grocery rhythm is repetitive while their available
attention is constrained.

### Secondary segments to investigate later

- Larger families
- Carers and multigenerational households
- Roommates
- Single-person households that value restock memory more than collaboration

The two-member limit is acceptable for the MVP, but it must be measured as an
acquisition constraint. Android support should move forward if otherwise
qualified households cannot participate because the partners use different
platforms.

## 5. Current value-proposition assessment

| Intended value | MVP capability | Current assessment | Evidence still required |
|---|---|---|---|
| Track grocery spending and see whether the household can save | Budgets, planned totals, receipt totals, trip history, and monthly spending | **Partially met.** Spending is described, but savings are not yet demonstrated or attributed. | Do households record enough completed shops to use the insight, change behaviour, and value the result? |
| Remove the burden of remembering restocks | Recurring products, deterministic cadence, restock review, notifications, and one-tap corrections | **Strongly implemented, not yet validated.** This is the main differentiator. | Does it replace a recurring memory task across at least three shopping cycles without creating false-positive fatigue? |
| Keep shopping coordinated so items are not missed | Shared lists, real-time behaviour, offline shopping, item history, and completion | **Strongly implemented, not yet validated.** | Do both members contribute, and do forgotten-item incidents decline from the household's baseline? |
| Track how grocery prices change over time | Shop totals and optional item estimates | **Not yet met.** Total-only receipts cannot produce trustworthy product-level history. | Can line items be captured and normalised accurately enough to create a useful personal price history? |

## 6. The desired household habit

OurPantry should optimise for a grocery cycle, not daily active use:

```text
Notice something is low
        ↓
Capture it immediately
        ↓
Review a nearly prepared Next shop
        ↓
Shop together with one shared source of truth
        ↓
Finish the shop and optionally record spend
        ↓
OurPantry learns and prepares the next cycle
```

A healthy product may reduce the number of sessions while increasing completed
shopping cycles and reducing forgotten items. Daily active users and raw screen
opens are therefore poor primary success measures.

## 7. Post-MVP product opportunities

### Tranche A — Strengthen the core cycle

These are the highest-priority candidates after MVP validation because they
make the existing job easier rather than broaden the product.

#### 7.1 Capture from where the need occurs

The most important moment is when someone notices that a product is nearly
finished. Reduce capture to one short action through:

- a Home Screen and Lock Screen widget;
- Siri and platform App Intents, such as “Add milk to OurPantry”;
- a Home Screen quick action;
- a share extension for retailer pages, recipes, and product links;
- natural-language entry such as “two packs of chicken from Tesco”; and
- recent, frequent, and household-favourite product shortcuts.

The capture action must default to the household's Next shop and work without
forcing the user to navigate through list management.

#### 7.2 Make the prepared shop the recurring pull

The Plan screen should make the product's background work visible:

> Saturday's shop is ready<br>
> 9 items planned · 5 remembered by OurPantry<br>
> 3 things need a quick check

The app should open to a useful state, not an empty list. Suggestions must
remain a short batch, explain why they appeared, and be correctable in one tap.

#### 7.3 Establish one pre-shop ritual

Use the household's chosen shopping rhythm to send one consolidated prompt:

> Before Saturday's shop<br>
> 3 regulars may need checking<br>
> Review in under a minute

Retain the MVP limit of no more than two restock notifications per shopping
cycle. Avoid generic daily reminders and individual notifications for every
product.

The complete MVP notification contract, cross-category frequency budget, and
candidate post-MVP cadences are maintained in
[`NOTIFICATION_STRATEGY.md`](NOTIFICATION_STRATEGY.md).

#### 7.4 Add a timely household handoff

When a household member starts shopping, allow one useful coordination prompt:

> Shopping has started — anything else?

Other useful shared states include who added an item, who picked it up, and
whether an item was left for next time. Prefer an in-app activity treatment over
an interruptive push for routine item changes.

#### 7.5 Make invisible value visible

After a completed shop, show a restrained value receipt:

> Shop complete<br>
> 12 items picked up<br>
> 6 regulars remembered by OurPantry<br>
> Both household members contributed<br>
> £7 under this shop's budget

The recap must use only observed facts. It must not estimate money saved from
remembered items or avoided duplicates without defensible evidence.

#### 7.6 Expand household access only where evidence requires it

- Prioritise Android if mixed-device couples are being excluded.
- Expand beyond two household members after the beta identifies a meaningful
  number of qualified families or carers blocked by the current limit.
- Keep one household subscription across supported members rather than charging
  each person separately.

### Tranche B — Build the savings and price-intelligence layer

These features should follow evidence that households consistently finish shops
and record spend.

#### 7.7 Actionable budget guidance

- Show monthly budget pace, not only amount spent.
- Compare a completed shop with its plan and with similar previous shops.
- Warn during planning when the estimated shop materially exceeds the remaining
  household guide.
- Explain whether a change came from a larger basket or higher known prices when
  the data supports that distinction.

#### 7.8 Personal usual-basket history

Build a household-specific price view before attempting national comparison:

- “Your usual shop is £11 more expensive than three months ago.”
- “You normally pay £1.60–£1.80 for this product.”
- “Coffee is 18% above the last price you recorded.”

This requires consistent item identity, quantity and unit normalisation, and
line-item purchase prices. Results must expose uncertainty instead of presenting
weak product matches as fact.

#### 7.9 Line-item receipt capture

Extend receipt processing only when the correction experience is fast enough
that it does not become household bookkeeping. Candidate capabilities include:

- line-item OCR;
- retailer-aware parsing;
- suggested product matches;
- one-tap correction and merge; and
- a confidence threshold below which the app asks instead of assuming.

Open Banking transaction totals do not replace this work because merchant-level
transactions do not provide a dependable grocery line-item history.

### Tranche C — Partnerships and market-wide savings

These are later opportunities because they introduce licensing, matching,
commercial-bias, privacy, and operational risks.

- Licensed supermarket product and price data
- Price-drop alerts for household regulars
- Loyalty-price support
- Transparent cheaper-store or substitute recommendations
- Retailer basket handoff
- Clearly disclosed affiliate revenue

Do not depend on retailer scraping, browser automation, or household credential
handling. Recommendations must remain useful when no commercial relationship
exists, and paid placement must never silently determine what the product calls
cheapest or best.

## 8. Monetisation hypothesis

### 8.1 Recommended model

Use a **household subscription** with a useful free baseline. One payer unlocks
the service for the whole household.

The free product preserves invitation and collaboration loops. The paid product
charges for the memory and intelligence that become more valuable over time.

### 8.2 Proposed packaging for validation

#### Free

- One shared household and active Next shop
- Real-time collaboration and offline shopping
- Manual item creation, editing, completion, and sharing
- A limited restock experience sufficient to demonstrate the value
- A short spending-history window

#### OurPantry Plus

- Unlimited tracked recurring products
- Restock cadence learning and consolidated reminders
- Full spending, receipt, and budget history
- Household recaps and advanced spending insights
- Personal product and usual-basket price history when available
- Future premium capture and retailer features where appropriate
- Access for every supported member of the household

The exact limits are hypotheses. They should be chosen so a free household can
experience the core value before being asked to pay, without making the free
product feel intentionally broken.

### 8.3 Initial price hypotheses

- **Founding household:** £14.99 per year
- **Public annual test:** £19.99 per year
- **Monthly alternative:** £2.49–£2.99 per month
- No weekly subscription

Annual should be the primary plan because the product's value compounds over
multiple grocery cycles. Test the prices with real payment intent; do not infer
willingness to pay from survey answers alone.

### 8.4 Trial and paywall timing

Do not start a trial at sign-up. Start it after:

1. the second household member joins;
2. recurring products have been selected; and
3. the first Next shop is ready.

The strongest payment moment is after the household has completed two or three
cycles and can see a factual value recap, for example:

> OurPantry remembered 14 regular items across your last three shops.

If the trial ends, preserve the household's shared manual list rather than
holding essential shopping data hostage.

### 8.5 Secondary revenue opportunities

Affiliate revenue may complement subscriptions after retailer handoff is useful
on its own. It must be optional, disclosed, and separated from ranking logic.

Partnerships with employee-benefit platforms, family services, or retailers may
be investigated after consumer retention is established. They should not drive
the early roadmap.

### 8.6 Models to avoid initially

- Advertising inside the core planning and shopping experience
- Selling or licensing identifiable household shopping data
- Paid retailer ranking disguised as a recommendation
- Receipt-reward mechanics that encourage low-quality uploads
- A lifetime plan before storage, OCR, notification, and support costs are known
- Per-member pricing that penalises household adoption

## 9. Validation plan

### 9.1 Research cohort

Recruit 20–30 qualified UK households, including couples, new parents, and
households where one person currently carries most of the grocery responsibility.
Interview both members where possible. Include mixed-device households to learn
whether iOS-only availability blocks adoption.

Before showing the product, record:

- the current list or coordination method;
- who notices, remembers, plans, and shops;
- the last three forgotten-item or duplicate-purchase incidents;
- time spent preparing a normal shop;
- usual shopping cadence; and
- tools or services already paid for.

Avoid relying on “Would you use this?” or “Would you pay?” Ask for concrete past
behaviour, then test a real purchase or refundable founding membership.

### 9.2 Beta duration

Observe each household for four to six shopping cycles. A single completed shop
tests usability; repeated cycles test whether OurPantry has replaced a memory
task.

### 9.3 Core measures

- Household activation: second member joined, recurring products selected, and
  first Next shop prepared
- Three-cycle household retention
- Percentage of shops where both household members contribute
- Percentage of suggested products added, postponed, rejected, or corrected
- False-positive and duplicate-suggestion rate
- Time from Plan open to review complete
- Products captured through quick-entry surfaces
- Forgotten-item incidents before and after adoption
- Completed shops with a usable spend record
- Qualitative response to “Did this reduce how much you had to remember?”

### 9.4 Early learning threshold

For a cohort of 30 qualified households, a promising signal would be:

- at least 18 activate with both members;
- at least 12 complete three shopping cycles;
- retained households accept or meaningfully correct suggestions rather than
  ignoring them;
- forgotten-item or mental-load reports improve; and
- at least five households make a real founding-year payment.

These are internal decision thresholds, not industry benchmarks.

### 9.5 Decision rules

- **Strong retention, weak payment:** test packaging, price, and value
  communication before adding broad features.
- **Strong manual-list use, weak restock use:** improve suggestion accuracy,
  setup, and timing; do not position the product as a household memory yet.
- **Strong restock use, weak two-member participation:** investigate invitation,
  mixed-platform, and household-role friction.
- **Strong spend recording, repeated requests for comparison:** advance personal
  price history before licensed market-wide comparison.
- **Weak three-cycle retention:** stop expanding the roadmap and return to
  problem interviews.

## 10. Product and engagement guardrails

- Optimise for completed household shopping cycles, not daily active users.
- Prefer event-based and household-chosen prompts over fixed daily pushes.
- Keep the server-enforced maximum of two restock notifications per cycle unless
  new research explicitly justifies a change.
- Do not create streaks, badges for opening the app, or a content feed solely to
  increase sessions.
- Do not require exact pantry quantities, consumption logging, or exhaustive
  setup.
- Do not add recipes, meal planning, or a chatbot without evidence that they
  strengthen the core grocery-memory job.
- Make automation explainable and corrections immediate.
- Treat fewer necessary interactions with better outcomes as a product win.

## 11. Market scenarios, not forecasts

At the £14.99 founding price:

| Paid households | Approximate gross annual recurring revenue |
|---:|---:|
| 1,000 | £14,990 |
| 10,000 | £149,900 |
| 29,000 — approximately 0.1% of UK households | £434,710 |

These figures exclude app-store commission, taxes, refunds, OCR and storage
costs, support, and customer acquisition. They demonstrate scale sensitivity;
they do not establish market share or forecast demand.

## 12. Research references

- [ONS — Families and households in the UK](https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/families/bulletins/familiesandhouseholds/latest)
- [ONS — Family spending in the UK, FYE 2025](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/bulletins/familyspendingintheuk/latest)
- [Ipsos — UK household price and grocery behaviour](https://www.ipsos.com/en-uk/over-2-5-britons-think-utility-and-broadband-companies-are-raising-prices-increase-profits-ahead)
- [European Societies — cognitive household labour and mental load](https://doi.org/10.1080/14616696.2023.2271963)
- [Apple Support — grocery lists in Reminders](https://support.apple.com/en-gb/105086)
- [Apple Developer — Reminders App Intent schemas](https://developer.apple.com/documentation/appintents/app-schema-domain-reminders)
- [AnyList Complete — household subscription and paid capabilities](https://www.anylist.com/complete)
- [Bring! App Store listing — free product and premium pricing](https://apps.apple.com/us/app/bring-grocery-shopping-list/id580669177)
- [OurGroceries user guide — free and paid model](https://www.ourgroceries.com/user-guide)
- [Trolley — UK grocery comparison model](https://www.trolley.co.uk/about/)
- [Notification micro-randomised trial](https://pmc.ncbi.nlm.nih.gov/articles/PMC10337295/)
- [Research on contextually placed reminder cues](https://doi.org/10.1086/725110)

## 13. Relationship to implementation planning

This strategy does not approve dependencies, schema changes, navigation changes,
retailer integrations, production services, or monetisation implementation.
Each tranche must be converted into an implementation brief with explicit scope,
success criteria, privacy impact, operational cost, and the approval checkpoints
required by `AGENT.md`.
