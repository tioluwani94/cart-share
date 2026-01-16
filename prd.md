# Product Requirements Document: CartShare — Collaborative Grocery Shopping App

## Executive Summary and Product Vision

**CartShare** is a real-time collaborative grocery shopping mobile app designed for couples managing shared household shopping. The core problem: coordinating grocery shopping between two people leads to duplicated purchases, forgotten items, and no visibility into household spending patterns. CartShare solves this by providing **real-time shared lists**, **receipt scanning with OCR**, and **spending analytics**—all designed for seamless in-store use with offline-first capabilities.

**Product Vision**: Become the indispensable shopping companion for couples who want to shop smarter together, eliminating the friction of "did you get the milk?" and providing clear visibility into where money goes.

**Target Launch**: Q2 2026 (iOS first, Android to follow)

**Success Criteria**: 1,000 active households within 90 days of launch, with 60%+ weekly retention and average 3+ shopping sessions per household per week.

---

## Design Philosophy and Visual Identity

### Design Principles

CartShare should feel **sleek, fun, playful, and interesting**—turning the mundane task of grocery shopping into a delightful shared experience. The app should spark joy while remaining highly functional.

**Core Design Pillars:**

1. **Sleek & Modern**: Clean layouts with generous whitespace, smooth transitions, and a polished feel that rivals top-tier consumer apps.

2. **Fun & Playful**: Micro-interactions, celebratory animations, and personality-filled empty states that make users smile.

3. **Interesting & Engaging**: Unexpected delights, clever copy, and visual surprises that make the app memorable.

4. **Warm & Collaborative**: Design that emphasizes the "together" aspect—seeing your partner's activity should feel connecting, not surveilling.

### Visual Style Guide

**Color Palette:**
- **Primary**: Vibrant coral/salmon (#FF6B6B) — energetic, warm, appetizing
- **Secondary**: Soft teal (#4ECDC4) — fresh, complementary, calming
- **Accent**: Sunny yellow (#FFE66D) — celebratory moments, highlights
- **Neutrals**: Warm grays with slight warmth, not cold/clinical
- **Backgrounds**: Off-white (#FAFAFA) light mode, rich charcoal (#1A1A2E) dark mode

**Typography:**
- **Headings**: Rounded, friendly sans-serif (e.g., SF Rounded, Nunito)
- **Body**: Clean, highly legible sans-serif
- **Numbers**: Tabular figures for prices/quantities, slightly playful for stats

**Iconography:**
- Rounded, filled icons with consistent stroke weight
- Subtle animations on interaction (bounce, wiggle, scale)
- Custom illustrated icons for empty states and onboarding

**Illustrations & Graphics:**
- Friendly, approachable illustration style for onboarding and empty states
- Food-themed decorative elements (subtle, not overwhelming)
- Partner avatars with fun customization options

### Micro-interactions & Animation

**Essential Animations:**
- **Check-off celebration**: Satisfying checkmark animation with subtle confetti or sparkle
- **Item add**: Smooth slide-in with gentle bounce
- **Pull-to-refresh**: Custom branded loading animation
- **Tab transitions**: Fluid, spring-based navigation
- **Receipt scan success**: Celebratory animation when total is extracted
- **Partner activity**: Gentle pulse or glow when partner makes changes

**Haptic Feedback:**
- Light tap on checkbox toggle
- Success haptic on item completion
- Subtle feedback on swipe actions

### Empty States & Personality

Every empty state should be an opportunity for delight:
- **Empty list**: Playful illustration + encouraging copy ("Your list is feeling lonely! Add some groceries 🥑")
- **No households**: Warm onboarding illustration ("Start your shopping adventure together!")
- **No spending data**: Optimistic message ("Your first receipt will unlock spending insights ✨")
- **Offline mode**: Friendly reassurance ("You're offline, but we've got your back!")

### Component Design Patterns

**Cards:**
- Generous padding (16-20px)
- Subtle shadows with warm tint
- Rounded corners (12-16px radius)
- Hover/press states with scale or glow

**Buttons:**
- Primary: Filled with gradient or solid vibrant color
- Secondary: Outlined with playful hover states
- Generous touch targets (minimum 48px)
- Micro-animation on press (scale down slightly, then up)

**Lists:**
- Clear visual hierarchy
- Swipe actions with color-coded backgrounds
- Smooth reordering animations
- Category headers with subtle decorative elements

**Forms:**
- Floating labels with smooth transitions
- Inline validation with friendly error messages
- Progress indicators for multi-step flows

---

## User Personas and Use Cases

### Primary Personas

**Persona 1: Sarah — The List Maker**
- **Demographics**: 34, marketing manager, married, suburban home
- **Tech proficiency**: High (iPhone user, uses 10+ apps daily)
- **Goals**: Keep household organized, never forget items, track spending
- **Frustrations**: Husband buys duplicates, no visibility into total grocery spend, paper lists get lost
- **Behavior**: Creates lists throughout the week, prefers Sunday meal prep and shopping
- **Quote**: "I just want to add something to the list and know it'll be there when we shop"

**Persona 2: Mike — The In-Store Shopper**
- **Demographics**: 36, software engineer, married, suburban home
- **Tech proficiency**: High (Android-curious iPhone user)
- **Goals**: Get in and out of store quickly, not miss anything on the list
- **Frustrations**: Calling/texting wife mid-shop to ask questions, forgetting to check items off
- **Behavior**: Does most physical shopping trips, prefers quick checkbox interactions
- **Quote**: "I want to open the app, see exactly what to get, check it off, and be done"

### Core Use Cases

| ID | Use Case | Primary Actor | Priority |
|----|----------|---------------|----------|
| UC-1 | Create household and invite partner | Sarah | Must Have |
| UC-2 | Add items to shared list (voice, text, or scan) | Both | Must Have |
| UC-3 | Real-time collaborative editing during shopping | Both | Must Have |
| UC-4 | Check off items while in-store (offline-capable) | Mike | Must Have |
| UC-5 | Scan receipt to capture spending | Mike | Must Have |
| UC-6 | View spending analytics over time | Sarah | Should Have |
| UC-7 | Create multiple lists (Costco, Trader Joe's, etc.) | Sarah | Should Have |
| UC-8 | Receive notification when partner adds items | Both | Could Have |

---

## Detailed Functional Requirements

### Feature Area 1: Authentication and Household Management

**F1.1 User Registration and Login**

Users must be able to create accounts and authenticate securely using OAuth providers (Google and Apple).

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F1.1.1 | Support Google OAuth sign-in | Must Have |
| F1.1.2 | Support Apple Sign-In (required for iOS App Store) | Must Have |
| F1.1.3 | Persist authentication state across app restarts | Must Have |
| F1.1.4 | Display loading state during authentication | Must Have |

**Acceptance Criteria for F1.1**:
```
Given a new user on the welcome screen
When they tap "Continue with Google"
Then OAuth flow completes in system browser
And a new account is created in Clerk
And user is created/matched in Convex database
And user is redirected to household setup
And authentication token is stored securely

Given a new user on the welcome screen
When they tap "Continue with Apple"
Then Apple Sign-In flow completes
And a new account is created in Clerk
And user is created/matched in Convex database
And user is redirected to household setup

Given a returning user on the welcome screen
When they tap "Continue with Google" or "Continue with Apple"
Then they are authenticated via Clerk
And redirected to their household's list view
And the process completes within 3 seconds
```

**F1.2 Household Creation and Management**

Households are the collaborative unit. Each user belongs to exactly one household (for MVP).

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F1.2.1 | New users can create a household with a name | Must Have |
| F1.2.2 | System generates unique 6-character invite code | Must Have |
| F1.2.3 | Users can join existing household via invite code | Must Have |
| F1.2.4 | Household limited to 2 members for MVP | Must Have |
| F1.2.5 | Display both household members with profile photos | Should Have |
| F1.2.6 | Household owner can rename household | Should Have |

**Acceptance Criteria for F1.2**:
```
Given an authenticated user without a household
When they complete household creation with name "Smith Family"
Then a household record is created in Convex
And a unique invite code is generated (format: ABC123)
And user is set as household owner
And user is redirected to empty list view

Given an authenticated user without a household
When they enter a valid invite code for an existing household
Then they are added as a member of that household
And both members see each other in the household
And the joining user sees all existing lists

Given a household with 2 members
When a third user attempts to join via invite code
Then they see error message "This household is full"
And they remain on the join screen
```

### Feature Area 2: Shopping Lists

**F2.1 List Management**

Users can create and manage multiple shopping lists within their household.

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F2.1.1 | Create new list with name (e.g., "Weekly Groceries") | Must Have |
| F2.1.2 | View all lists for household on home screen | Must Have |
| F2.1.3 | Archive completed lists (soft delete) | Must Have |
| F2.1.4 | Display item count and completion percentage per list | Must Have |
| F2.1.5 | Assign optional category to list (Groceries, Costco, etc.) | Should Have |
| F2.1.6 | Reorder lists via drag-and-drop | Could Have |

**Acceptance Criteria for F2.1**:
```
Given a user on the home screen
When they tap the "+" button and enter "Costco Trip"
Then a new list is created in Convex
And it appears immediately in both partners' list views
And the list shows "0 items" initially

Given a list with 5 items (3 completed)
When viewing the home screen
Then the list displays "3/5 items" or "60% complete"
And completed items are visually distinguished

Given a user viewing an empty list
When they tap "Archive List"
Then the list is marked as archived
And it no longer appears on the home screen
And it remains accessible in "Archived Lists" section
```

**F2.2 Item Management**

Items are the core unit of shopping lists with support for quantity, notes, and categorization.

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F2.2.1 | Add item with name (required) | Must Have |
| F2.2.2 | Add optional quantity and unit (e.g., "2 lbs") | Must Have |
| F2.2.3 | Mark item as complete (checkbox) | Must Have |
| F2.2.4 | Delete item with swipe gesture | Must Have |
| F2.2.5 | Edit item name, quantity, notes | Must Have |
| F2.2.6 | Categorize items (Produce, Dairy, Meat, etc.) | Should Have |
| F2.2.7 | Sort items by category for in-store efficiency | Should Have |
| F2.2.8 | Show who added each item | Should Have |
| F2.2.9 | Add item via voice input | Could Have |

**Acceptance Criteria for F2.2**:
```
Given a user viewing a list
When they type "Milk" in the add item field and tap Add
Then an item "Milk" is created in Convex
And it appears immediately for both household members
And shows the adding user's avatar

Given an item "Apples" exists in a list
When user swipes left on the item
Then a red "Delete" action is revealed
When they tap Delete
Then item is removed from Convex
And disappears from both users' views immediately

Given a user in-store with the list open
When they tap the checkbox next to "Bread"
Then the item is marked complete immediately (optimistic update)
And the item moves to "Completed" section or shows strikethrough
And sync occurs when network available

Given a list with items: Milk (Dairy), Apples (Produce), Chicken (Meat)
When user taps "Sort by Category"
Then items are grouped under category headers
And within each category, items are alphabetized
```

### Feature Area 3: Real-Time Collaboration

**F3.1 Live Sync and Presence**

Both partners see updates in real-time without manual refresh.

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F3.1.1 | All list/item changes sync to both users within 1 second | Must Have |
| F3.1.2 | Show visual indicator when partner is viewing same list | Should Have |
| F3.1.3 | Show "Partner added [item]" toast notification | Should Have |
| F3.1.4 | Conflict resolution: last-write-wins with timestamp | Must Have |

**Acceptance Criteria for F3.1**:
```
Given both Sarah and Mike have the same list open
When Sarah adds item "Eggs"
Then Mike sees "Eggs" appear within 1 second
And a subtle toast shows "Sarah added Eggs"

Given Mike checks off "Bread" on his device
When Sarah is viewing the same list
Then she sees "Bread" become checked within 1 second
And the completion is attributed to Mike

Given both users edit the same item simultaneously
When Sarah changes quantity to "2" and Mike changes to "3"
Then the change with later timestamp wins
And both users see the final consistent state
```

### Feature Area 4: Receipt Scanning and OCR

**F4.1 Receipt Capture**

Users can photograph receipts to capture spending data automatically.

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F4.1.1 | Launch camera to capture receipt image | Must Have |
| F4.1.2 | Upload receipt image to Convex storage | Must Have |
| F4.1.3 | Process image via Google Cloud Vision API | Must Have |
| F4.1.4 | Extract total amount from receipt text | Must Have |
| F4.1.5 | Associate receipt with shopping session/list | Must Have |
| F4.1.6 | Display extracted total for user confirmation | Must Have |
| F4.1.7 | Allow manual correction of extracted total | Must Have |
| F4.1.8 | Extract individual line items from receipt | Should Have |
| F4.1.9 | Match extracted items to list items | Could Have |

**Acceptance Criteria for F4.1**:
```
Given a user who just completed shopping
When they tap "Scan Receipt" and photograph a receipt
Then the image uploads to Convex storage
And Google Cloud Vision processes the image
And the extracted total is displayed within 5 seconds
And user can confirm or edit the amount

Given a receipt image is processed
When Vision API extracts "Total: $87.43"
Then the system displays "$87.43" as the extracted total
And creates a shopping session record with this amount

Given Vision API fails to extract a clear total
When processing completes
Then user sees "Couldn't read total" message
And a text field is provided for manual entry
```

### Feature Area 5: Shopping Sessions and Spending Analytics

**F5.1 Shopping Session Tracking**

Track when shopping trips occur and their associated costs.

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F5.1.1 | Create shopping session when list is marked complete | Must Have |
| F5.1.2 | Associate receipt total with session | Must Have |
| F5.1.3 | Record session date, store (optional), shopper | Must Have |
| F5.1.4 | View history of past shopping sessions | Should Have |

**F5.2 Spending Analytics**

Visualize spending patterns over time.

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F5.2.1 | Display total spending for current month | Should Have |
| F5.2.2 | Show spending trend chart (last 6 months) | Should Have |
| F5.2.3 | Compare spending month-over-month | Should Have |
| F5.2.4 | Break down spending by store (if tracked) | Could Have |
| F5.2.5 | Set monthly spending budget with progress indicator | Could Have |

**Acceptance Criteria for F5.2**:
```
Given a user on the Analytics screen
When they have 3+ shopping sessions recorded
Then a line chart displays spending over time
And current month total is prominently displayed
And chart is accessible via VoiceOver with data description

Given a user with sessions in January ($400) and February ($350)
When viewing month-over-month comparison
Then display shows "-12.5%" or "$50 less than last month"
```

### Feature Area 6: Offline Capabilities

**F6.1 Offline-First Architecture**

The app must function in low/no connectivity environments (common in stores).

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| F6.1.1 | Cache active lists locally via MMKV | Must Have |
| F6.1.2 | Allow adding items while offline | Must Have |
| F6.1.3 | Allow checking off items while offline | Must Have |
| F6.1.4 | Queue all mutations for sync when online | Must Have |
| F6.1.5 | Display clear offline indicator in UI | Must Have |
| F6.1.6 | Sync automatically when connectivity restored | Must Have |
| F6.1.7 | Handle conflicts via last-write-wins with timestamps | Must Have |

**Acceptance Criteria for F6.1**:
```
Given a user opens the app while offline
When they have previously loaded their lists
Then cached lists display from MMKV
And an offline indicator appears in the header

Given a user is offline viewing a list
When they add item "Butter" and check off "Milk"
Then changes appear immediately in the UI
And changes are queued in local storage

Given a user made offline changes and regains connectivity
When the app detects network availability
Then queued mutations sync to Convex automatically
And offline indicator disappears
And partner sees the synced changes
```

---

## User Flows

### Flow 1: First-Time User Onboarding

```
1. User downloads and opens app
2. Welcome screen displays with value proposition
3. User taps "Get Started"
4. Authentication options shown (Google, Apple)
5. User completes authentication via Clerk
6. [If new user] Household setup screen
   a. Option A: "Create Household" → Enter name → Generate invite code → Show code to share
   b. Option B: "Join Household" → Enter invite code → Join existing household
7. User arrives at empty list view with prompt to create first list
8. User creates first list → Arrives at empty list with prompt to add items
```

### Flow 2: Collaborative Shopping Session

```
1. Sarah opens app at home, creates list "Weekly Groceries"
2. Sarah adds items throughout the week (Milk, Eggs, Bread, etc.)
3. Saturday: Mike opens app at store, sees list with all items
4. Mike's phone shows offline indicator (poor store connectivity)
5. Mike checks off "Milk" (optimistic update, queued)
6. Sarah, at home, sees "Milk" checked off when Mike's phone syncs
7. Mike adds "Ice Cream" (Sarah sees it appear)
8. Mike completes all items, taps "Complete Shopping"
9. App prompts "Scan receipt?"
10. Mike photographs receipt → OCR extracts $87.43
11. Mike confirms total → Shopping session recorded
12. Sarah sees spending update in analytics
```

### Flow 3: Receipt Scanning

```
1. User taps "Scan Receipt" from completed list or home screen
2. Camera interface opens with capture guide overlay
3. User photographs receipt
4. Loading indicator while image uploads and processes
5. [Success] Extracted total displayed: "We found $87.43"
   - User taps "Confirm" → Session saved
   - User taps "Edit" → Manual entry field
6. [Failure] "Couldn't read receipt" message
   - Manual entry field provided
   - User enters total and confirms
7. Return to home screen with success toast
```

---

## Data Model and Schema

### Entity Relationship Overview

```
Users (1) ←→ (1) HouseholdMembers (N) ←→ (1) Households
                                              ↓
                                        Lists (N)
                                              ↓
                                        Items (N)

Households (1) ←→ (N) ShoppingSessions
                              ↓
                        Receipts (1)
```

### Convex Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users - synced from Clerk webhooks
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Households - the collaborative unit
  households: defineTable({
    name: v.string(),
    inviteCode: v.string(), // 6-character unique code
    ownerId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_invite_code", ["inviteCode"]),

  // Household Members - join table (max 2 per household for MVP)
  householdMembers: defineTable({
    householdId: v.id("households"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_user", ["userId"])
    .index("by_household_and_user", ["householdId", "userId"]),

  // Shopping Lists
  lists: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    category: v.optional(v.string()), // "groceries", "costco", etc.
    isArchived: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_active", ["householdId", "isArchived"]),

  // List Items
  items: defineTable({
    listId: v.id("lists"),
    name: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()), // "lbs", "oz", "each", "gallon"
    notes: v.optional(v.string()),
    category: v.optional(v.string()), // "produce", "dairy", "meat"
    isCompleted: v.boolean(),
    addedBy: v.id("users"),
    completedBy: v.optional(v.id("users")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_list", ["listId"])
    .index("by_list_and_completed", ["listId", "isCompleted"]),

  // Shopping Sessions
  shoppingSessions: defineTable({
    householdId: v.id("households"),
    listId: v.optional(v.id("lists")),
    totalAmount: v.number(), // In cents to avoid floating point
    storeName: v.optional(v.string()),
    shopperId: v.id("users"),
    receiptImageId: v.optional(v.id("_storage")),
    sessionDate: v.number(),
    createdAt: v.number(),
  })
    .index("by_household", ["householdId"])
    .index("by_household_date", ["householdId", "sessionDate"]),
});
```

### Data Validation Rules

- **User email**: Must be valid email format, unique across system
- **Household name**: 1-50 characters, required
- **Invite code**: Exactly 6 alphanumeric characters, unique, auto-generated
- **List name**: 1-100 characters, required
- **Item name**: 1-200 characters, required
- **Quantity**: Positive number if provided
- **Total amount**: Stored in cents (integer), must be non-negative

---

## Non-Functional Requirements

### Performance Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| App launch to interactive | < 2 seconds | Cold start on iPhone 12+ |
| List load time | < 500ms | Time to display items |
| Item add/check latency | < 100ms | Optimistic update perceived |
| Real-time sync latency | < 1 second | Change visible to partner |
| Receipt OCR processing | < 5 seconds | Upload to result display |
| Offline queue sync | < 3 seconds | When connectivity restored |
| FlashList scroll | 60 FPS | Lists with 100+ items |

### Security Requirements

| Requirement | Description |
|-------------|-------------|
| Authentication | All API calls require valid Clerk JWT token |
| Authorization | Users can only access their household's data |
| Data encryption | All data encrypted in transit (TLS 1.3) |
| Token storage | Secure storage via Expo SecureStore |
| Receipt images | Stored in Convex with household-scoped access |
| No PII in logs | Exclude email, names from error logging |

### Offline Requirements

| Requirement | Description |
|-------------|-------------|
| Cache strategy | Cache active lists and items in MMKV |
| Offline mutations | Queue locally, sync when online |
| Conflict resolution | Last-write-wins using client timestamps |
| Cache invalidation | Refresh on app foreground if stale > 5 minutes |
| Storage limit | Cache up to 10MB of list data |

### Accessibility Requirements (iOS HIG Compliance)

| Requirement | Description |
|-------------|-------------|
| VoiceOver | All interactive elements have accessibility labels |
| Dynamic Type | Support 200%+ text scaling without truncation |
| Touch targets | Minimum 44x44 points for all buttons |
| Color contrast | Minimum 4.5:1 for text, 3:1 for large text |
| Reduce Motion | Respect system setting, provide alternatives |
| Color independence | Never convey information via color alone |

---

## Technical Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App (Expo)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ NativeWind  │  │  FlashList  │  │  MMKV (Offline)     │  │
│  │ (Styling)   │  │  (Lists)    │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Convex React Client                        ││
│  │  - useQuery (real-time subscriptions)                   ││
│  │  - useMutation (with optimistic updates)                ││
│  │  - ConvexProviderWithClerk (auth integration)           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (real-time)
                              │ HTTPS (mutations/actions)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Queries         │  │ Mutations       │  │ Actions     │  │
│  │ (Read data)     │  │ (Write data)    │  │ (External)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                              │                      │        │
│  ┌───────────────────────────┴──────────────────────┘       │
│  │                                                           │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐    │
│  │  │ Convex Database │  │ Convex File Storage         │    │
│  │  │ (Document DB)   │  │ (Receipt Images)            │    │
│  │  └─────────────────┘  └─────────────────────────────┘    │
│  │                                                           │
└──┼───────────────────────────────────────────────────────────┘
   │
   │ (Actions call external APIs)
   ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ Clerk           │  │ Google Cloud Vision API          │   │
│  │ (Auth Provider) │  │ (Receipt OCR)                    │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | React Native | 0.76+ | Cross-platform mobile |
| Platform | Expo | SDK 52+ | Development tooling, native APIs |
| Styling | NativeWind | 4.2+ | Tailwind CSS for React Native |
| State/Backend | Convex | Latest | Real-time database, serverless functions |
| Authentication | Clerk | Latest | User auth, session management |
| Lists | FlashList | 1.6+ | Performant list rendering |
| Local Storage | MMKV | 3.x | Fast key-value cache |
| OCR | Google Cloud Vision | v1 | Receipt text extraction |

### Project Structure

```
cartshare/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth flow screens
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home (lists)
│   │   ├── analytics.tsx         # Spending analytics
│   │   ├── settings.tsx          # Settings & household
│   │   └── _layout.tsx
│   ├── list/
│   │   └── [id].tsx              # List detail screen
│   ├── scan-receipt.tsx          # Receipt camera
│   ├── _layout.tsx               # Root layout (providers)
│   └── +not-found.tsx
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Input.tsx
│   │   └── index.ts
│   ├── lists/                    # List-specific components
│   │   ├── ListCard.tsx
│   │   ├── ListItem.tsx
│   │   └── AddItemInput.tsx
│   ├── analytics/                # Analytics components
│   │   └── SpendingChart.tsx
│   └── layout/                   # Layout components
│       ├── Header.tsx
│       └── OfflineIndicator.tsx
├── convex/                       # Convex backend
│   ├── schema.ts                 # Database schema
│   ├── auth.config.ts            # Clerk auth config
│   ├── users.ts                  # User queries/mutations
│   ├── households.ts             # Household queries/mutations
│   ├── lists.ts                  # List queries/mutations
│   ├── items.ts                  # Item queries/mutations
│   ├── sessions.ts               # Shopping session functions
│   ├── vision.ts                 # OCR action
│   └── http.ts                   # Webhook routes
├── lib/
│   ├── cn.ts                     # Tailwind class utility
│   ├── useOfflineQueue.ts        # Offline mutation queue
│   ├── useNetworkStatus.ts       # Connectivity hook
│   └── cssInterops.ts            # NativeWind interops
├── hooks/
│   ├── useColorScheme.ts
│   └── useHousehold.ts
├── constants/
│   └── categories.ts             # Item categories
├── global.css                    # Tailwind base styles
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── nativewind-env.d.ts
├── app.json
└── package.json
```

---

## API and Integration Specifications

### Clerk Authentication Setup

**Required Clerk Dashboard Configuration:**
1. Create Clerk application for "CartShare"
2. Enable authentication methods: Google OAuth, Apple Sign-In
3. Create JWT Template named "convex" (must be this exact name)
4. Configure Convex JWT settings in template
5. Set up webhook endpoint for user sync: `https://<convex-deployment>.convex.site/webhook/clerk`

**Environment Variables Required:**
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CLERK_JWT_ISSUER_DOMAIN=https://verb-noun-00.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...
```

### Google Cloud Vision API Integration

**Setup Requirements:**
1. Create Google Cloud project
2. Enable Cloud Vision API
3. Create service account with Vision API access
4. Generate API key or service account JSON
5. Store key in Convex environment variables

**API Call Specification:**
```typescript
// Convex action calling Vision API
POST https://vision.googleapis.com/v1/images:annotate?key={API_KEY}

Request Body:
{
  "requests": [{
    "image": {
      "source": { "imageUri": "{convex_storage_url}" }
    },
    "features": [
      { "type": "TEXT_DETECTION" }
    ]
  }]
}

Expected Response Fields:
- responses[0].textAnnotations[0].description (full text)
- responses[0].fullTextAnnotation.text (structured text)
```

**Total Extraction Logic:**
Search extracted text for patterns:
- "TOTAL" followed by dollar amount
- "GRAND TOTAL" followed by dollar amount
- "AMOUNT DUE" followed by dollar amount
- Pattern: `/(?:TOTAL|GRAND TOTAL|AMOUNT DUE)[:\s]*\$?([\d,]+\.?\d*)/i`

### Convex Function Specifications

**Key Queries:**
```typescript
// lists.ts
export const getByHousehold = query({
  args: { householdId: v.id("households") },
  handler: async (ctx, { householdId }) => {
    // Returns all non-archived lists for household
    // Validates user is member of household
  }
});

// items.ts  
export const getByList = query({
  args: { listId: v.id("lists") },
  handler: async (ctx, { listId }) => {
    // Returns all items for list
    // Validates user has access via household membership
  }
});
```

**Key Mutations:**
```typescript
// items.ts
export const add = mutation({
  args: { listId: v.id("lists"), name: v.string(), quantity: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Creates item, returns item ID
  }
});

export const toggleComplete = mutation({
  args: { itemId: v.id("items"), isCompleted: v.boolean() },
  handler: async (ctx, args) => {
    // Updates completion status
    // Records completedBy and completedAt
  }
});
```

**Key Actions:**
```typescript
// vision.ts
export const processReceipt = action({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, { imageId }) => {
    // 1. Get signed URL from Convex storage
    // 2. Call Google Cloud Vision API
    // 3. Extract total from response
    // 4. Return { extractedTotal, rawText, confidence }
  }
});
```

---

## Success Metrics and KPIs

### Primary Metrics

| Metric | Target | Measurement Period |
|--------|--------|-------------------|
| Active Households | 1,000 | 90 days post-launch |
| Weekly Active Users | 70% of registered | Rolling 7 days |
| Shopping Sessions/Household/Week | 3+ | Rolling 7 days |
| 30-Day Retention | 50% | Cohort analysis |
| App Store Rating | 4.5+ stars | Ongoing |

### Feature-Specific Metrics

| Feature | Metric | Target |
|---------|--------|--------|
| Lists | Lists created per household | 3+ |
| Items | Items added per list | 10+ average |
| Collaboration | % lists with items from both users | 60% |
| Receipt Scanning | OCR success rate (no manual edit) | 80% |
| Offline | Successful offline syncs | 95% |

### Technical Health Metrics

| Metric | Target |
|--------|--------|
| App crash rate | < 0.5% |
| API error rate | < 1% |
| P95 API latency | < 500ms |
| Offline sync failures | < 2% |

---

## Implementation Phases and Milestones

### Phase 1: Foundation (Weeks 1-3)

**Goal**: Core infrastructure and authentication working

| Milestone | Deliverables |
|-----------|--------------|
| M1.1 | Expo project setup with NativeWind configured |
| M1.2 | Convex backend initialized with schema deployed |
| M1.3 | Clerk authentication integrated (Google, Apple) |
| M1.4 | Basic navigation structure (auth flow, tabs) |
| M1.5 | Household creation and invite code flow |

**Exit Criteria**: User can sign up, create household, share invite code, partner can join.

### Phase 2: Core Lists (Weeks 4-6)

**Goal**: Full list and item management with real-time sync

| Milestone | Deliverables |
|-----------|--------------|
| M2.1 | List CRUD operations (create, view, archive) |
| M2.2 | Item CRUD operations (add, edit, delete, complete) |
| M2.3 | Real-time sync between devices verified |
| M2.4 | FlashList integration for performant scrolling |
| M2.5 | Swipe gestures for item actions |

**Exit Criteria**: Two users can collaboratively manage a shared list in real-time.

### Phase 3: Offline and Polish (Weeks 7-8)

**Goal**: Reliable offline experience and UI polish

| Milestone | Deliverables |
|-----------|--------------|
| M3.1 | MMKV caching layer for active lists |
| M3.2 | Offline mutation queue with sync |
| M3.3 | Network status detection and UI indicator |
| M3.4 | Optimistic updates for all mutations |
| M3.5 | Error handling and edge cases |

**Exit Criteria**: User can add/check items offline, changes sync when online.

### Phase 4: Receipt Scanning (Weeks 9-10)

**Goal**: Working receipt OCR with spending tracking

| Milestone | Deliverables |
|-----------|--------------|
| M4.1 | Camera interface for receipt capture |
| M4.2 | Image upload to Convex storage |
| M4.3 | Google Cloud Vision integration |
| M4.4 | Total extraction and confirmation UI |
| M4.5 | Shopping session creation |

**Exit Criteria**: User can scan receipt, see extracted total, confirm/edit, session saved.

### Phase 5: Analytics and Launch (Weeks 11-12)

**Goal**: Spending analytics and App Store submission

| Milestone | Deliverables |
|-----------|--------------|
| M5.1 | Spending analytics screen with charts |
| M5.2 | Month-over-month comparisons |
| M5.3 | Accessibility audit and fixes |
| M5.4 | Performance optimization pass |
| M5.5 | App Store submission and TestFlight beta |

**Exit Criteria**: App approved for App Store, beta testing complete.

---

## Technical Implementation Notes for Claude Code

### NativeWind Setup Checklist

```bash
# Install dependencies
npm install nativewind tailwindcss@^3.4.17
npm install react-native-reanimated react-native-safe-area-context

# Initialize Tailwind
npx tailwindcss init
```

**Required configuration files with exact contents specified in Technical Architecture section.**

**Key patterns to follow:**
- Use `cn()` utility from `clsx` + `tailwind-merge` for class composition
- Apply `cssInterop` for FlashList and any third-party components
- Import `global.css` as first import in root layout
- Use `dark:` prefix for dark mode variants

### Convex Patterns

**Always validate auth in queries/mutations:**
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

**Use indexes for all filtered queries:**
```typescript
.withIndex("by_household", (q) => q.eq("householdId", householdId))
```

**Pattern for external API calls:**
1. Mutation receives user input
2. Mutation schedules action: `ctx.scheduler.runAfter(0, internal.vision.process, args)`
3. Action calls external API
4. Action calls internal mutation to store results

### Offline Queue Pattern

```typescript
// On mutation attempt when offline:
1. Execute optimistic update (update local UI immediately)
2. Store mutation in MMKV queue: { fn, args, timestamp }
3. On network restore, process queue in order
4. Handle conflicts with last-write-wins using timestamp
```

### iOS HIG Compliance Checklist

- [ ] Tab bar with 3-4 tabs maximum
- [ ] 44pt minimum touch targets
- [ ] Large title navigation pattern
- [ ] Swipe-to-delete with red destructive action
- [ ] Sheet modals for focused tasks
- [ ] System SF font via NativeWind defaults
- [ ] Support Dynamic Type (avoid fixed font sizes)
- [ ] VoiceOver labels on all interactive elements

---

## Acceptance Criteria Summary by Feature

### Authentication
- ✅ User can sign in with Google OAuth
- ✅ User can sign in with Apple (iOS requirement)
- ✅ Auth state persists across app restarts
- ✅ Loading states shown during auth operations

### Household
- ✅ New user can create household with name
- ✅ Unique invite code generated (6 characters)
- ✅ User can join household via invite code
- ✅ Maximum 2 members per household enforced
- ✅ Both members visible in household view

### Lists
- ✅ User can create list with name
- ✅ Lists display with item count and completion %
- ✅ Lists appear in real-time for both users
- ✅ User can archive completed lists

### Items
- ✅ User can add item with name
- ✅ User can add optional quantity and unit
- ✅ User can check/uncheck items
- ✅ User can delete items via swipe
- ✅ Changes sync in < 1 second to partner
- ✅ Items sortable by category

### Offline
- ✅ App loads cached data when offline
- ✅ User can add items while offline
- ✅ User can check items while offline
- ✅ Offline indicator visible in header
- ✅ Changes sync automatically when online

### Receipt Scanning
- ✅ Camera opens to capture receipt
- ✅ Image uploads successfully
- ✅ OCR extracts total within 5 seconds
- ✅ User can confirm or edit extracted total
- ✅ Shopping session created with amount

### Analytics
- ✅ Current month spending total displayed
- ✅ 6-month spending trend chart shown
- ✅ Chart accessible via VoiceOver

---

## Appendix: CLAUDE.md File for Project

Create this file in the project root for Claude Code context:

```markdown
# CartShare - Claude Code Instructions

## Build Commands
- `npm run start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npx convex dev` - Start Convex development server
- `npx convex deploy` - Deploy Convex to production

## Code Style
- Use TypeScript for all files
- Use NativeWind (Tailwind) for styling, not StyleSheet
- Use `cn()` utility for combining classes
- Destructure imports when possible
- Use async/await, not .then() chains

## Project Patterns
- All screens in `app/` directory (Expo Router)
- Reusable UI components in `components/ui/`
- Convex functions in `convex/` directory
- Always validate auth in Convex queries/mutations
- Use FlashList for any list > 10 items
- Use MMKV for local caching, not AsyncStorage

## Testing
- Run `npx expo start` and test on iOS simulator
- Test offline by enabling Airplane Mode
- Verify real-time sync with two simulator instances

## Boundaries
- ✅ Always: Run typecheck before commits
- ✅ Always: Use Convex indexes for filtered queries
- ⚠️ Ask first: Adding new npm dependencies
- ⚠️ Ask first: Modifying Convex schema
- 🚫 Never: Store secrets in code (use environment variables)
- 🚫 Never: Skip auth validation in Convex functions
```

---

*This PRD provides comprehensive specifications for building CartShare. Implementation should proceed phase-by-phase, with each milestone validated before moving to the next. The acceptance criteria are designed to be testable and specific, enabling Claude Code to implement features with clear success definitions.*