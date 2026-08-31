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
    fontFamily: "System"
    fontSize: "34pt"
    fontWeight: 700
    lineHeight: 1.12
  headline:
    fontFamily: "System"
    fontSize: "22pt"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "System"
    fontSize: "17pt"
    fontWeight: 600
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
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "14px 20px"
    height: "48px"
  button-tonal:
    backgroundColor: "{colors.primary-coral-soft}"
    textColor: "{colors.primary-coral}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
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

It rejects cartoonish gamification, dashboard clutter, prompt-first AI, exact-inventory administration, decorative gradients, glass surfaces, excessive cards, and motion that delays the task.

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
- **Clear Surface** (`#FFFFFF`): Focused controls, sheets, and selectively grouped content.
- **Household Ink** (`#1A1917`): Primary text and icons.
- **Secondary Ink** (`#5C5A54`): Supporting text that remains legible on Canvas and Surface.
- **Quiet Separator** (`#E8E6E1`): Dividers and control outlines.
- **Evening Canvas** (`#1A1A2E`), **Evening Surface** (`#24243A`), and **Evening Ink** (`#FAFAFA`): Deliberate dark-appearance roles.

**The One Voice Rule.** Household Coral should occupy no more than roughly 10% of a task screen. Its rarity makes the primary action obvious.

**The Semantic Colour Rule.** Teal means completed or healthy; yellow means attention; coral means action or selection. Never swap these roles for variety.

## 3. Typography

**Display Font:** SF Pro on iOS; Roboto on Android; system fallback elsewhere
**Body Font:** SF Pro on iOS; Roboto on Android; system fallback elsewhere
**Label/Mono Font:** Platform system font with tabular figures for money

**Character:** One familiar system family keeps the interface quick to scan and properly supports Dynamic Type. Personality comes from copy, hierarchy, and spacing instead of introducing a decorative UI font.

### Hierarchy

- **Display** (700, platform Large Title / approximately 34 pt): Top-level Plan and Spending titles only.
- **Headline** (700, approximately 22 pt): The next-shop date, completion state, and focused section headings.
- **Title** (600, approximately 17 pt): Product names, buttons, and grouped-section headers.
- **Body** (400, approximately 17 pt): Explanations, metadata, and user-generated notes.
- **Label** (600, approximately 13 pt): Compact counts, chips, and supporting control labels. Sentence case only.

**The Native Scale Rule.** Use platform text roles and let them scale. Do not hand-tune a new font size for every screen.

**The Plain Language Rule.** Prefer "Usually bought every 7 days" to confidence percentages or algorithmic terminology.

## 4. Elevation

The interface is flat by default. Hierarchy comes from spacing, typography, separators, and tonal surfaces. Shadows are reserved for temporary elements that physically rise above content: sheets, menus, drag states, and the active floating keyboard accessory when one is necessary.

### Shadow Vocabulary

- **Overlay** (`0 10px 25px rgba(26, 25, 23, 0.12)`): Bottom sheets and temporary menus only.
- **Lifted Interaction** (`0 4px 14px rgba(26, 25, 23, 0.08)`): Dragging or an actively pressed floating control, never static rows.

**The Flat-by-Default Rule.** If removing a shadow does not damage the information hierarchy, remove it.

## 5. Components

### Buttons

- **Shape:** Soft native rectangle with 12 px radius, not a capsule by default.
- **Primary:** Household Coral with white text, at least 48 px high and full-width only when the action owns the screen.
- **Pressed / Focus:** Short 150–200 ms tonal darkening with subtle haptic feedback where appropriate; visible platform focus treatment for keyboard and assistive input.
- **Secondary:** Tonal Coral Whisper or plain text depending emphasis. Avoid thick coloured outlines as the default secondary style.
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

### Inputs / Fields

- **Style:** Platform text field behaviour, 12 px radius, Surface fill, Household Ink text, and Quiet Separator outline where needed.
- **Focus:** Primary tint plus native focus behaviour. Keyboard does not cover the active field or submit action.
- **Error / Disabled:** Error copy appears next to the field and remains visible to screen readers; never use colour as the sole signal.

### Navigation

- **iOS:** Native-feeling tab bar, large top-level titles, navigation stack for detail, sheet for self-contained review and editing tasks, preserved edge-swipe back gesture.
- **Android:** Material navigation bar at compact width, rail or drawer at expanded widths, predictive Back, edge-to-edge layout with correct insets.
- **Destinations:** Plan, Shop, and Spending. Household settings open from the profile control and do not occupy a primary tab.

### Restock Row

The signature element presents a product name, one plain-language reason, and three decisions. On compact screens, Add is immediately visible while Still have some and Not this time remain reachable without horizontal scrolling. The row never claims an item is out of stock; it communicates an estimate.

### Shopping Row

A shopping row prioritises the checkbox, product name, quantity, and optional price. Notes and attribution are secondary. Completion uses a short state transition and haptic response; per-item confetti is prohibited.

### Activation Step

Each activation screen asks for one small household decision and keeps Skip visible. “People you usually buy groceries for” uses a simple stepper with a numeric accessibility value; it is not presented as surveillance or a precise consumption formula. The flow ends by revealing a useful Next shop, not with a decorative success screen.

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
- **Do** test the active-shop flow offline, one-handed, with large text and long product names.
- **Do** use generic lock-screen notification copy that does not reveal products, spend, or household details.
- **Do** make notification and analytics choices independently reversible in Settings.

### Don't:

- **Don't** create cartoonish or game-like pantry management with constant celebration.
- **Don't** build dashboard-heavy productivity screens or display a grid of equal cards.
- **Don't** make a chatbot or prompt box the main interface for routine grocery decisions.
- **Don't** require exact inventory or ask users to record every consumed item.
- **Don't** use autonomous or opaque recommendations that hide why an item was suggested.
- **Don't** use decorative gradients, glass surfaces, gradient text, side-stripe accents, or nested cards.
- **Don't** use raw hard-coded colours where platform semantic roles are needed for dark mode or increased contrast.
- **Don't** animate every row on load or celebrate individual checkbox taps with confetti.
- **Don't** ask for notification permission at first launch or bundle analytics consent into account creation.
