---
name: Our Pantry — Next Shop
description: A calm household memory that prepares the next grocery shop.
colors:
  primary-coral: "#C94A4A"
  primary-coral-soft: "#FBE9E9"
  fresh-teal: "#297D76"
  fresh-teal-soft: "#E4F3F1"
  notice-yellow: "#FFE66D"
  canvas: "#FAFAFA"
  surface: "#FFFFFF"
  household-ink: "#1A1917"
  secondary-ink: "#5C5A54"
  separator: "#E8E6E1"
  dark-canvas: "#1A1A2E"
  dark-surface: "#24243A"
  dark-ink: "#FAFAFA"
typography:
  display:
    fontFamily: "Nunito_900Black"
    fontSize: "34pt"
    fontWeight: 900
    lineHeight: 1.12
  headline:
    fontFamily: "Nunito_900Black"
    fontSize: "22pt"
    fontWeight: 900
    lineHeight: 1.2
  title:
    fontFamily: "Nunito_900Black"
    fontSize: "17pt"
    fontWeight: 900
    lineHeight: 1.3
  button:
    fontFamily: "Nunito_800ExtraBold"
    fontSize: "17pt"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "System"
    fontSize: "17pt"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "System"
    fontSize: "13pt"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-coral}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    material: "native-liquid-glass-with-brand-tint"
    rounded: "{rounded.pill}"
    padding: "14px 20px"
    height: "48px"
  button-tonal:
    backgroundColor: "rgba(201, 74, 74, 0.14)"
    textColor: "{colors.primary-coral}"
    typography: "{typography.button}"
    material: "native-clear-liquid-glass"
    rounded: "{rounded.pill}"
    padding: "14px 20px"
    height: "48px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.household-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "52px"
  suggestion-chip:
    backgroundColor: "{colors.primary-coral-soft}"
    textColor: "{colors.primary-coral}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 14px"
    height: "44px"
---

# Design System: Our Pantry — Next Shop

## 1. Overview

**Creative North Star: "The Quiet Kitchen Counter"**

The interface should feel like returning to a clear kitchen counter where the next shop has already been considered. It is light-first because the primary contexts are a bright kitchen and a supermarket aisle, but it supports a deliberately designed dark appearance rather than a mechanical inversion.

The system is restrained, native, and task-oriented. Warmth comes from language, the coral identity colour, responsive touch feedback, and a small number of meaningful illustrations—not from covering the interface with decoration. Familiar platform behaviour is part of the visual identity: users should immediately understand navigation, lists, sheets, toggles, and swipe actions.

It rejects cartoonish gamification, dashboard clutter, prompt-first AI, exact-inventory administration, decorative gradients, decorative or stacked glass surfaces, excessive cards, and motion that delays the task. Restrained system material is reserved for temporary bottom-sheet chrome and interactive button layers, where translucency reinforces physical hierarchy.

**Key Characteristics:**

- One clear primary action per screen.
- Flat list structure with generous rhythm and purposeful grouping.
- Explanations that make predictions feel trustworthy.
- Colour reserved for action, completion, and attention.
- Native interaction patterns adapted for iOS first and Android later.

## 2. Colors

The palette preserves the existing coral, teal, yellow, and warm-neutral identity while moving interactive colours to accessible tonal values.

### Primary

- **Household Coral** (`#C94A4A`): Primary actions, selected navigation, focus, and compact emphasis. White text reaches accessible contrast on this darker evolution of the existing coral.
- **Coral Whisper** (`#FBE9E9`): Tonal action backgrounds and selected rows. Pair with Household Coral text, never low-contrast grey.

### Secondary

- **Fresh Teal** (`#297D76`): Completed, saved, synced, and healthy budget states. It is semantic rather than decorative.
- **Teal Mist** (`#E4F3F1`): Completion and success containers with Fresh Teal text.

### Tertiary

- **Notice Yellow** (`#FFE66D`): Uncertain or attention-needed states. Always pair with Household Ink, never white.

### Neutral

- **Clean Canvas** (`#FAFAFA`): Light app background.
- **Clear Surface** (`#FFFFFF`): Focused controls, the accessible solid fallback for sheets, and selectively grouped content.
- **Household Ink** (`#1A1917`): Primary text and icons.
- **Secondary Ink** (`#5C5A54`): Supporting text that remains legible on Canvas and Surface.
- **Quiet Separator** (`#E8E6E1`): Dividers and control outlines.
- **Evening Canvas** (`#1A1A2E`), **Evening Surface** (`#24243A`), and **Evening Ink** (`#FAFAFA`): Deliberate dark-appearance roles.

**The One Voice Rule.** Household Coral should occupy no more than roughly 10% of a task screen. Its rarity makes the primary action obvious.

**The Semantic Colour Rule.** Teal means completed or healthy; yellow means attention; coral means action or selection. Never swap these roles for variety.

## 3. Typography

**Heading Font:** Nunito Black (`Nunito_900Black`) on every platform
**Body Font:** SF Pro on iOS; Roboto on Android; system fallback elsewhere
**Button Font:** Nunito ExtraBold (`Nunito_800ExtraBold`)
**Label/Mono Font:** Platform system font with tabular figures for money

**Character:** Nunito gives headings the warm, rounded voice established by the welcome and activation flows. Body copy stays in the platform system family for long-form legibility and Dynamic Type. This is a two-family system, not permission to mix fonts ad hoc.

### Hierarchy

- **Display** (Nunito Black 900, approximately 34 pt): Top-level screen and onboarding titles.
- **Headline** (Nunito Black 900, approximately 22 pt): Completion states and focused section headings.
- **Title** (Nunito Black 900, approximately 17–20 pt): Compact card and sheet headings.
- **Button** (Nunito ExtraBold 800, approximately 17 pt): Shared primary, secondary, and tonal button labels.
- **Body** (400, approximately 17 pt): Explanations, metadata, and user-generated notes.
- **Label** (600, approximately 13 pt): Compact counts, chips, and supporting control labels. Sentence case only.

**The Heading Token Rule.** Use NativeWind's `font-heading` token for heading text. It resolves to the preloaded `Nunito_900Black` face. Do not combine arbitrary `font-bold` system text with heading-sized type. The shared `Button` owns its `Nunito_800ExtraBold` label style.

**The Native Scale Rule.** Keep the approved display/headline/title sizes and let text scale. Do not hand-tune a new font size for every screen, clip headings to a fixed height, or disable font scaling.

**The Plain Language Rule.** Prefer "Usually bought every 7 days" to confidence percentages or algorithmic terminology.

## 4. Elevation

The interface is flat by default. Hierarchy comes from spacing, typography, separators, and tonal surfaces. Shadows are reserved for temporary elements that physically rise above content: sheets, menus, drag states, and the active floating keyboard accessory when one is necessary.

### Shadow Vocabulary

- **Overlay** (`0 10px 25px rgba(26, 25, 23, 0.12)`): Bottom sheets and temporary menus only.
- **Lifted Interaction** (`0 4px 14px rgba(26, 25, 23, 0.08)`): Dragging or an actively pressed floating control, never static rows.

**The Flat-by-Default Rule.** If removing a shadow does not damage the information hierarchy, remove it.

## 5. Components

### Buttons

- **Shape:** A native-feeling capsule at least 48 px high. Icon-only actions use the shared `iconOnly` layout: an exact 48×48 pt circle at the small size, with no inherited horizontal padding.
- **Primary:** Native iOS Liquid Glass with a Household Coral tint and white text. It stays visually strong and becomes full-width only when the action owns the screen.
- **Secondary:** Fresh Teal uses the same native tinted treatment. Tonal and outline actions use native Clear Liquid Glass over ordinary content; ghost actions remain surface-free so every action does not compete for elevation.
- **Platform fallback:** iOS 26 uses `GlassView`. Earlier iOS versions use System Thin Material, while Android and Reduce Transparency use opaque semantic fills with the same hierarchy.
- **Material boundaries:** Never blur a button on top of another glass surface. Inside a glass sheet, tonal and outline actions switch automatically to solid Coral Whisper or Clear Surface fallbacks.
- **Pressed / Focus:** Respond on touch-down with a critically damped scale to 0.97 and a brief tonal overlay; keep visible platform focus treatment for keyboard and assistive input.
- **Accessibility:** Respect Reduce Motion and Reduce Transparency independently. Reduced transparency uses opaque semantic fills without changing the button hierarchy.
- **Disabled / Loading:** Preserve label readability, prevent repeat submission, and retain the control's dimensions.

### Chips

- **Style:** Chips are reserved for short decisions such as Add, Later, and Still have some.
- **State:** Selected state uses a semantic tonal fill plus icon or text change; colour alone is insufficient.
- **Targets:** Minimum 44 pt on iOS and 48 dp on Android even when the visual pill appears smaller.

### Cards / Containers

- **Corner Style:** 16 px for genuine self-contained summaries such as Next shop; ordinary products use flat rows.
- **Background:** Surface on Canvas or a semantic tonal background.
- **Shadow Strategy:** Flat at rest; use a separator or tonal distinction before elevation.
- **Border:** One-pixel Quiet Separator when a container needs an edge.
- **Internal Padding:** 16–24 px depending density.

### Toasts / Transient Feedback

- **Host:** Use the single app-level `ToastProvider`; screens call `useToast()` and never position their own transient banners. The host replaces by default and can queue deliberate consecutive messages, so two surfaces never occupy the same slot.
- **Placement:** Anchor below the top safe area and persistent 56 pt header row with an 8 pt breathing gap. Toasts remain mounted across route changes and never compete with page-specific layout insets.
- **Surface:** Use one compact, content-sized, opaque Clear Surface with a Quiet Separator edge, 22 px corners, and restrained temporary elevation. Do not use glass here: the toast already floats over progressive header material, and stacked translucency weakens legibility.
- **Semantics:** Pair concise sentence-case copy with one Lucide symbol in a semantic tonal well. Teal is success, coral is error, yellow is warning, and neutral information stays warm grey. Do not put emoji, punctuation-based checkmarks, or decorative celebration in the message.
- **Motion:** Enter over 180 ms with an 8 pt top-origin translation and opacity using `Easing.bezier(0.23, 1, 0.32, 1)`; exit along the same path over 150 ms. Animate only transform and opacity on the UI thread. Reduce Motion keeps the shorter opacity transition and removes translation.
- **Haptics:** The toast host owns at most one semantic notification haptic for the completed user action. Callers must not fire a second success, warning, or error haptic for the same result.
- **Accessibility:** Expose the surface as a polite live alert with one grouped accessibility label. Keep it visible for at least 5 seconds when a screen reader is active, allow at most two visual lines, and make the full message available to assistive technology.

### Inputs / Fields

- **Style:** Platform text field behaviour, 12 px radius, Surface fill, Household Ink text, and Quiet Separator outline where needed.
- **Focus:** Primary tint plus native focus behaviour. Keyboard does not cover the active field or submit action.
- **Dismissal:** Every single-line field uses Done/Return to blur. Tapping outside a field, dragging any scroll surface, moving to another route, or panning a sheet releases the keyboard. Multiline notes keep Return for new lines but retain the same outside-tap and scroll escape paths. New scroll views use `keyboardDismissScrollProps`; do not deliberately refocus a field after submission.
- **Error / Disabled:** Error copy appears next to the field and remains visible to screen readers; never use colour as the sole signal.
- **Amounts:** Use the shared `AmountInput` for every editable currency value. It owns the fixed currency prefix, grouped thousands, two-digit pence limit, decimal keyboard, tabular figures, focus/error states, and accessibility contract. Use its default `field` presentation for budgets and estimated prices; reserve `prominent` for a screen's single total-entry task. Placeholders contain digits only because the component renders the currency symbol.

### Navigation

- **iOS:** Native-feeling tab bar, large top-level titles, navigation stack for detail, sheet for self-contained review and editing tasks, preserved edge-swipe back gesture.
- **Android:** Material navigation bar at compact width, rail or drawer at expanded widths, predictive Back, edge-to-edge layout with correct insets.
- **Destinations:** Plan, Shop, and Spending. Household settings open from the profile control and do not occupy a primary tab.

#### Tab scroll chrome

- **Shared structure:** Plan, Shop, and Spending use `CollapsibleTabHeader` with a large semantic heading in scroll content and one compact visual title in fixed navigation chrome. Do not create screen-specific large-title animations.
- **Collapse:** Drive the transition directly from scroll position. The large title fades and scales subtly from its leading edge while the compact title crossfades into the centre. Animate only opacity and transforms; never animate font size or header layout.
- **Persistent actions:** Profile and Finish controls stay anchored on the trailing edge throughout the collapse. Shop may retain its compact progress line below the centred title; secondary metadata scrolls away.
- **Scroll edge:** `ProgressiveBlurEdge` is reserved for persistent header and tab-bar chrome. Render scrolling content before this edge so native blur samples the live pixels underneath it. Keep blur spill and visual falloff independent from content insets: the default treatment extends 16 pt past the chrome and fades over a bounded 64 pt region. Use a system-material base plus low-intensity clipped blur layers; do not add a white wash over live material.
- **Bottom chrome:** Use the shared floating tab bar for Plan, Shop, and Spending. In its expanded state, inset the visible capsule 24 pt from each screen edge so it reads as a centred floating control rather than an edge-to-edge system bar. Its outer layout footprint stays fixed so screens never jump, while the inner material moves between a 58 pt labelled state and a 46 pt compact, icon-only state. All three destinations remain visible, centre their icons in both states, and keep at least a 44 pt touch target. The selected destination uses a quiet coral tonal capsule, not a filled tab or detached floating action button. A continuous system-material underlay protects the full footer footprint so scrolling content never reads sharply behind or below the floating bar. Keep that material as an independent background sibling behind the tab and accessory controls, and bleed it below the bottom safe area just as header material bleeds above the top safe area; the material must never wrap or alter control geometry. Screen-specific controls such as Shop's Add item composer register as a footer accessory: the shared material expands behind them, while the controls render above the blur in the same dock. Never position a scene-owned composer underneath navigation blur or bridge the layers with overlap offsets. Screen content includes the complete dock height in its bottom inset so every item remains reachable.
- **Scroll response:** Near the top (within 24 pt), the bar is expanded. A meaningful downward scroll compacts it; a meaningful upward scroll expands it. Clamp overscroll and bottom bounce before evaluating direction so rubber-banding cannot flip the state. Tab presses also restore the expanded state. Do not make the tab bar draggable or scrub between destinations.
- **Motion:** Header collapse remains continuous, clamped, reversible, and has no spring or bounce. The tab bar changes size with a critically damped transform-only spring; labels crossfade while icons remain present, and the coral selection capsule moves without layout animation. Tab-screen changes stay immediate and only the selected icon receives subtle scale feedback. Reduce Motion switches chrome state immediately and removes optional transforms.
- **Fallbacks:** Reduce Transparency replaces live material with an opaque Surface and Quiet Separator. Live navigation blur and glass are iOS-only; Android uses the same fixed footprint and interaction geometry with a stable opaque Surface rather than experimental blur.

#### Secondary screen chrome

- **Shared header:** Settings, list details, tracked products, restock review, receipt confirmation, and receipt capture use the shared `PageHeader`. It owns the top safe area, compact centred title, leading navigation action, and optional trailing action; screens must not rebuild this geometry locally.
- **Scroll edge:** The light header is fixed above full-height content and uses the same bounded `ProgressiveBlurEdge` material as tab chrome. Scroll containers add the shared header height to their content and indicator insets so the first content remains readable while later content can pass beneath the material. Avoid opaque header fills and hard bottom dividers.
- **Camera context:** Receipt capture keeps the same geometry and progressive edge but switches to a dark system-material tint with white foreground controls. Reduce Transparency resolves both light and dark treatments to legible opaque semantic fallbacks.

### Settings Screen

Settings use the shared primitives in `components/settings` so household information, planning controls, preferences, and account actions read as one native system.

- **Structure:** Group related rows inside `SettingsSection`. Sections use an opaque Surface fill, a 16 px corner radius, one Quiet Separator edge, and concise sentence-case labels. Do not turn every preference into a standalone card.
- **Rows:** Use `SettingsRow` for summaries, navigation, disclosure, and actions. Keep the whole row tappable with an immediate tonal pressed state, a minimum 44 pt target, and a single semantic trailing affordance. Use `SettingsToggleRow` for binary preferences so the platform-native switch owns the state and accessibility semantics.
- **Editors:** Open focused, reversible values such as budget and reminder time in `GlassBottomSheet`. The sheet is the only glass layer; fields and choice rows on it remain opaque. Save or selection dismisses the sheet, while errors stay visible beside the affected control.
- **Hierarchy:** Household context comes first, followed by planning, notification/privacy controls, then account actions. Destructive actions sit together at the end and use danger colour without adding decorative elevation.
- **Motion:** Do not animate the screen on entry. Disclosure chevrons rotate over 160 ms and expanded rows settle with an interruptible 180 ms layout transition. Press feedback is tonal rather than bouncy. Reduce Motion resolves these changes without spatial animation.
- **Accessibility:** Section labels are headers; disclosure rows expose expanded state; choice rows use radio semantics; switches expose checked/disabled state; values and action results are included in specific accessibility labels.

### Bottom Sheets

- **Default implementation:** Every self-contained bottom-sheet task uses the shared `GlassBottomSheet` wrapper around Gorhom Bottom Sheet. Do not introduce page-sheet or hand-built bottom-modal variants.
- **Material:** System Material Light blur with a restrained warm translucent fill, bright one-pixel edge, 28 px top corners, and the Overlay shadow. Do not stack additional translucent cards inside it.
- **Content hierarchy:** Ordinary sheets begin with `GlassSheetHeader`: one semantic icon well, a short title and supporting sentence, plus a quiet 48 pt close action. Use coral for routine tasks, teal for positive guidance, neutral for contextual information, and danger only for destructive confirmation.
- **Controls on glass:** Inputs, option rows, segmented choices, and chips use opaque semantic surfaces (`surface`, `coralSoft`, or `tealSoft`) directly on the sheet. Never put translucent white cards, pills, or controls on top of the sheet blur; the sheet is the single glass layer.
- **Actions:** Keep one visually dominant action. Secondary and destructive alternatives sit below it at full width, using the shared button hierarchy and its automatic solid-on-glass fallback.
- **Interaction:** Direct 1:1 dragging, pan-down dismissal, a responsive interruptible spring, keyboard-aware positioning, and a 34% dimming backdrop. Disable dismissal while an irreversible save is in flight.
- **Keyboard contract:** Editable sheet forms use the shared `Input` and `AmountInput`; `GlassBottomSheet` automatically supplies Gorhom's keyboard-integrated text field so the focused control is lifted above the keyboard. Tall forms use `GlassBottomSheetScrollView` and remain scrollable while editing. Do not render a raw `TextInput` inside a sheet.
- **Accessibility:** Follow the system Reduce Motion setting. When Reduce Transparency is enabled, replace blur with an opaque Clean Canvas surface while preserving contrast and hierarchy.
- **Boundaries:** System alerts, popovers, celebrations, and full-screen media viewers keep their purpose-built interaction patterns. The receipt image viewer intentionally uses a dark media stage instead of the ordinary light sheet hierarchy.

### Restock Row

The signature element presents a product name, one plain-language reason, and three decisions. On compact screens, Add is immediately visible while Still have some and Not this time remain reachable without horizontal scrolling. The row never claims an item is out of stock; it communicates an estimate.

### Shopping Row

A shopping row prioritises the checkbox, product name, quantity, and optional price. Notes and attribution are secondary. Completion uses a short state transition and haptic response; per-item confetti is prohibited.

### Activation Step

Each activation screen asks for one small household decision. The four-step launch activation is deliberately short and required; do not add a skip action inside it. Optional notification and analytics choices remain separate and skippable. “People you usually buy groceries for” uses a simple stepper with a numeric accessibility value; it is not presented as surveillance or a precise consumption formula. The flow ends by revealing a useful Next shop, not with a decorative success screen.

### Onboarding Form Screen

Short account and household forms use the shared `OnboardingFormScreen` frame. It follows the same focused rhythm as the activation flow without inventing progress for a single-step task.

- **Header:** Optional 48 pt back control at the top-left. Do not put Back in the footer.
- **Artwork:** One 144 pt decorative miniature, followed by a centred Nunito display heading and one concise supporting sentence.
- **Content:** One decision or form group. Alternative routes such as “Join instead” remain inline with the content and use a minimum 44 pt target.
- **Footer:** One full-width primary action in a full-bleed safe-area footer. It follows the keyboard on iOS so the action remains visible.
- **Motion:** Expo Router's native stack owns forward/back movement. Do not stagger every child on mount. Inline errors may fade over 150ms and rare success states may crossfade over 200ms using `Easing.bezier(0.23, 1, 0.32, 1)`; both remain opacity-only under Reduce Motion.

### Activation Choice Illustration

Dimensional illustrations may appear in activation choice rows only when the image makes the options faster to distinguish. The approved set covers shopping cadence and shopping method. Household size stays focused on the number, while the dynamic starter-product grid stays text-led so it remains compact and can represent products that do not have bespoke artwork.

- **Visual language:** Original, softly rounded 3D miniatures with a tactile matte finish, a front three-quarter view, transparent canvas, soft upper-left light, and a restrained contact shadow. Household Coral leads; warm ivory and charcoal form the object; Fresh Teal is a small accent only.
- **Size and layout:** Render artwork at 64 pt inside an 80 pt minimum-height choice row. Keep a consistent square footprint and enough transparent margin that silhouettes do not feel crowded.
- **Cadence set:** Use one compact flip-calendar object across all four options. Weekly has one seven-day row; Every two weeks has two seven-day rows; Monthly has a simple four-row grid with one coral ring; It varies has three irregular markers joined by one integrated teal curve. Do not add groceries, baskets, loose arrows, clocks, or duplicate calendars.
- **Shopping-mode set:** In store uses one empty handheld basket; Online uses one phone with a basket symbol integrated into its screen; Both uses one continuous phone–basket hybrid. Do not add storefronts, groceries, produce, people, delivery vehicles, floating badges, or separate phone-and-basket props.
- **Interaction:** Illustrations are static at rest and inherit the row's short press and selection response. Do not add autonomous loops, decorative particles, or motion that delays the decision.
- **Accessibility:** The row label carries the accessible name and state. Treat the bitmap as decorative, hide it from assistive technology, and never put essential text or numerals inside the artwork.
- **Restraint:** Do not extend this treatment to ordinary settings, repeated grocery rows, or every empty state. Generated art should strengthen a meaningful moment, not become the default icon system.

### Generated Icon Standard

Generated onboarding icons follow a simple, premium isometric language inspired by the restraint of high-quality hospitality products while remaining visibly OurPantry.

- **One-idea rule:** Each icon communicates one noun or one action with one dominant object. A second cue is allowed only when it is integrated into that object, such as a house-shaped key bow. Do not build a miniature scene.
- **Object budget:** One dominant object, zero loose props, and at most one small integrated accent. Plants, produce piles, furniture, decorative architecture, people, labels, and storytelling extras are rejected unless they are the subject itself.
- **Thumbnail test:** The silhouette and meaning must remain clear at the actual 64 pt or 144 pt shipping size. If details disappear or compete at that size, remove them rather than enlarging the artwork.
- **Form and material:** Use rounded, simplified geometry with matte ceramic or soft-touch surfaces, a clean three-quarter isometric view, soft front-top light, and one compact contact shadow. Avoid glossy toy, emoji, photorealistic, or highly textured finishes.
- **Colour:** Household Coral leads; warm ivory supports; Fresh Teal appears only as a small functional accent. Keep enough tonal contrast to separate forms without outlines and do not borrow another company's logo, trademarked shape, or signature brand colour.
- **Canvas and consistency:** Use a genuinely transparent square canvas with generous margins. Keep scale, camera angle, lighting, material, shadow softness, and visual weight consistent across the set.
- **Review gate:** Reject any result that needs its full resolution to make sense, contains more objects than the prompt requested, or feels like an illustration scene rather than a focused product icon.

### Household Onboarding Illustration

Household creation and joining use the same tactile 3D visual language at a larger 144 pt hero size. The approved assets are `assets/onboarding/household/create-household.png` and `assets/onboarding/household/join-household.png`.

- Keep the artwork on a genuinely transparent canvas and render with `contentFit="contain"`.
- Treat it as decorative: hide it from assistive technology and put the meaning in the heading.
- Reuse the create-household artwork for the calm household-ready state; do not add emoji confetti or a separate celebration style.
- The create asset is one compact house. The join asset is one key with an integrated house-shaped bow. Do not add gardens, grocery baskets, produce, charms, or separate supporting objects.
- New onboarding artwork must follow the Generated Icon Standard above: coral-led, matte rounded 3D material, clean three-quarter view, soft front-top light, restrained shadow, and a single readable idea.

### Empty-State Card

Persistent empty states use `components/ui/EmptyStateCard.tsx` so hierarchy, typography, actions, artwork scale, and accessibility stay consistent.

- **Material:** The card is an opaque `surface` with one separator border. It is not glass. Apple-style translucency communicates floating functional hierarchy; an empty state belongs to the page's persistent content layer. Never place an empty-state card on another card or glass surface. Use the component's `embedded` variant inside an existing surface.
- **Hierarchy:** Show one decorative artwork or one Lucide symbol, one concise Nunito heading, one helpful sentence, and at most one full-width primary action. Do not add nested explanation cards, badges, or multiple competing actions.
- **Artwork threshold:** Use matte 3D artwork only for meaningful first-use or household states such as no planned shop, no spending history, an unconfigured grocery rhythm, or a completed restock review. Routine subsection gaps and recovery states use the compact Lucide fallback.
- **3D language:** Empty-state artwork follows the Generated Icon Standard: one dominant object, transparent canvas, clear 96 pt silhouette, coral-led matte geometry, warm ivory support, and teal only as a small integrated accent.
- **Motion:** Reveal the card with a restrained 180 ms opacity transition when asynchronous content resolves. Do not stagger its children, loop the artwork, pulse the action, or animate on every list update. Reduce Motion keeps only the shorter opacity reveal.
- **Accessibility:** Generated artwork is decorative and hidden from assistive technology. The heading is exposed as a header, copy remains real text, and any action keeps a specific accessibility label and a minimum 48 pt target.

### Secondary Task Screen

Receipt capture and confirmation, list detail, restock review, tracked-product editing, and recovery states share one compact task structure. These screens should feel like the same product even when they are reached only from a completion flow or deep link.

- **Header:** Use the shared `PageHeader` with a 48 pt back or close action, a centred Nunito title, and at most one trailing action. Do not recreate a bespoke white navigation bar per route.
- **Layout:** Use 24 pt horizontal margins and a top-weighted reading order. Focused transient states may centre a short message, but forms and decisions must not float inside a large dead zone when the keyboard or primary action needs the space.
- **Hierarchy:** One semantic icon well, one clear heading, one concise explanation, then the task. Prefer flat groups and separators to stacked cards; inputs are already solid surfaces and should sit directly on sheet material.
- **Actions:** One full-width primary action owns the bottom of the task. Secondary or recovery actions are quiet tonal or ghost buttons. Disabled actions must remain legible.
- **Motion:** Expo Router's native stack owns route movement. Within a route, use a 180 ms opacity crossfade with `Easing.bezier(0.23, 1, 0.32, 1)` when receipt or loading state changes, and a 160 ms opacity reveal for optional explanations. Do not stagger screen children, pulse decorative guides, or replay entrance motion after ordinary list updates. Reduce Motion removes spatial movement while preserving state clarity.
- **Feedback:** Reserve haptics and semantic completion treatment for capture, save, or whole-trip completion. Use Lucide symbols in tonal wells for errors and empty states; emoji and confetti do not belong in routine secondary flows.

### Notification Permission Prompt

Request operating-system notification permission only after the first useful plan is visible. A compact in-app pre-prompt explains the concrete value—one reminder when a restock review is ready—and offers “Not now” without visual punishment. The system prompt follows only after an affirmative action.

### Privacy and Analytics Choice

Analytics consent is a plain-language beta choice, separate from notifications and activation completion. It uses equal-weight “Share usage data” and “Not now” actions, links to the privacy explanation, and never uses a preselected toggle or guilt-inducing copy.

## 6. Do's and Don'ts

### Do:

- **Do** keep Household Coral (`#C94A4A`) for the single primary action and selected state.
- **Do** use flat rows and one-pixel separators for repeated grocery items.
- **Do** explain recommendations with dates or ordinary cadence language.
- **Do** provide loading skeletons that preserve the final screen structure.
- **Do** reserve illustration and celebration for activation, meaningful empty states, and finishing a whole shop.
- **Do** adapt controls, back behaviour, navigation, type, and touch targets to each platform.
- **Do** use `font-heading` for all heading-sized text and the shared onboarding frame for short household forms.
- **Do** test the active-shop flow offline, one-handed, with large text and long product names.
- **Do** use generic lock-screen notification copy that does not reveal products, spend, or household details.
- **Do** make notification and analytics choices independently reversible in Settings.

### Don't:

- **Don't** create cartoonish or game-like pantry management with constant celebration.
- **Don't** build dashboard-heavy productivity screens or display a grid of equal cards.
- **Don't** make a chatbot or prompt box the main interface for routine grocery decisions.
- **Don't** require exact inventory or ask users to record every consumed item.
- **Don't** use autonomous or opaque recommendations that hide why an item was suggested.
- **Don't** use decorative gradients, decorative or stacked glass surfaces, gradient text, side-stripe accents, or nested cards. Restrained glass belongs only to temporary sheet chrome and shared interactive button layers.
- **Don't** use raw hard-coded colours where platform semantic roles are needed for dark mode or increased contrast.
- **Don't** animate every row on load or celebrate individual checkbox taps with confetti.
- **Don't** stack staggered child entrances on top of a native route transition or use emoji as onboarding artwork.
- **Don't** ask for notification permission at first launch or bundle analytics consent into account creation.
