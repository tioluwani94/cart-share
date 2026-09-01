# CartShare - Claude Code Instructions

## Build Commands

- `pnpm start` - Start Expo development server
- `pnpm ios` - Run on iOS simulator
- `pnpm dlx convex dev` - Start Convex development server
- `pnpm dlx convex deploy` - Deploy Convex to production

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

## Design System

### Color Palette
- **Primary**: Vibrant coral/salmon (#FF6B6B)
- **Secondary**: Soft teal (#4ECDC4)
- **Accent**: Sunny yellow (#FFE66D)
- **Neutrals**: Warm grays (not cold/clinical)
- **Backgrounds**: Off-white (#FAFAFA) light mode, rich charcoal (#1A1A2E) dark mode

### Typography
- Headings: `font-heading` (preloaded `Nunito_900Black`) for every screen, sheet, card, and empty-state heading
- Buttons: use the shared `Button`, which owns `Nunito_800ExtraBold`
- Body: Clean, highly legible sans-serif
- Numbers: Tabular figures for prices/quantities

Do not use a plain `font-bold` system face for heading-sized text. Body copy and compact labels remain in the platform system family. Short household/account forms should use `components/onboarding/OnboardingFormScreen.tsx` so the back control, 144 pt artwork, keyboard-safe content, and one-action footer stay consistent.

### Component Guidelines
- Cards: 16-20px padding, 12-16px border radius, subtle warm shadows
- Buttons: Minimum 48px touch targets, micro-animation on press
- Lists: Swipe actions with color-coded backgrounds, smooth reordering

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React Native 0.76+ | Cross-platform mobile |
| Platform | Expo SDK 52+ | Development tooling, native APIs |
| Styling | NativeWind 4.2+ | Tailwind CSS for React Native |
| State/Backend | Convex | Real-time database, serverless functions |
| Authentication | Clerk | User auth, session management |
| Lists | FlashList 1.6+ | Performant list rendering |
| Local Storage | MMKV 3.x | Fast key-value cache |
| OCR | Google Cloud Vision v1 | Receipt text extraction |

## Project Structure

```
cartshare/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Auth flow screens
│   ├── (tabs)/             # Main app tabs (home, analytics, settings)
│   ├── list/[id].tsx       # List detail screen
│   └── scan-receipt.tsx    # Receipt camera
├── components/
│   ├── ui/                 # Reusable UI (Button, Card, Checkbox, Input)
│   ├── lists/              # List-specific (ListCard, ListItem, AddItemInput)
│   ├── analytics/          # Analytics components
│   └── layout/             # Layout (Header, OfflineIndicator)
├── convex/                 # Convex backend
│   ├── schema.ts           # Database schema
│   ├── users.ts            # User queries/mutations
│   ├── households.ts       # Household queries/mutations
│   ├── lists.ts            # List queries/mutations
│   ├── items.ts            # Item queries/mutations
│   ├── sessions.ts         # Shopping session functions
│   └── vision.ts           # OCR action
├── lib/                    # Utilities
│   ├── cn.ts               # Tailwind class utility
│   ├── useOfflineQueue.ts  # Offline mutation queue
│   └── useNetworkStatus.ts # Connectivity hook
├── hooks/                  # Custom hooks
└── constants/              # App constants
```

## Environment Variables

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CLERK_JWT_ISSUER_DOMAIN=https://verb-noun-00.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...
GOOGLE_CLOUD_VISION_API_KEY=...
```

## Key Implementation Patterns

### Convex Auth Validation
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
```

### Convex Index Usage
```typescript
.withIndex("by_household", (q) => q.eq("householdId", householdId))
```

### Offline Queue Pattern
1. Execute optimistic update (update local UI immediately)
2. Store the operation under its signed-in user and household scope
3. Identify offline-created items with a stable client ID
4. On network restore, replay FIFO using absolute intended values
5. Resolve conflicts by Convex server-arrival order; later applied writes win

### External API Calls (Actions)
For durable/background work:
1. Mutation receives user input
2. Mutation schedules action: `ctx.scheduler.runAfter(0, internal.vision.process, args)`
3. Action calls external API
4. Action calls internal mutation to store results

For immediate, transient user-facing results (such as receipt total
confirmation), an authenticated public action may call the external API
directly. It must authorize the referenced resource through an internal query
and return only the minimum non-sensitive result; raw provider output is never
returned to the client.

## Accessibility Requirements (iOS HIG)

- [ ] VoiceOver labels on all interactive elements
- [ ] Support Dynamic Type (200%+ text scaling)
- [ ] Minimum 44x44pt touch targets
- [ ] Color contrast: 4.5:1 for text, 3:1 for large text
- [ ] Respect Reduce Motion system setting
- [ ] Never convey information via color alone

## Performance Targets

| Metric | Target |
|--------|--------|
| App launch to interactive | < 2 seconds |
| List load time | < 500ms |
| Item add/check latency | < 100ms (optimistic) |
| Real-time sync latency | < 1 second |
| Receipt OCR processing | < 5 seconds |
| FlashList scroll | 60 FPS |
