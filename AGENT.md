# CartShare - Agent Instructions

This file provides context and guidelines for AI agents working autonomously on the CartShare project.

## Project Overview

CartShare is a real-time collaborative grocery shopping mobile app for couples. Key features:
- Real-time shared shopping lists
- Receipt scanning with OCR
- Spending analytics
- Offline-first capabilities

**Target**: iOS first (Q2 2026), Android to follow

## Current Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| Phase 1 | Foundation (Expo, Convex, Clerk auth, Household setup) | Pending |
| Phase 2 | Core Lists (CRUD, real-time sync, FlashList) | Pending |
| Phase 3 | Offline and Polish (MMKV caching, offline queue) | Pending |
| Phase 4 | Receipt Scanning (Camera, OCR, sessions) | Pending |
| Phase 5 | Analytics and Launch (Charts, App Store) | Pending |

## Decision Authority

### Agent CAN decide autonomously:
- Component file structure within established patterns
- CSS/Tailwind class choices following design system
- Variable and function naming
- Import organization
- Error message wording
- Console log placement for debugging
- Test file organization

### Agent MUST ask before:
- Adding new npm dependencies
- Modifying Convex schema (schema.ts)
- Changing authentication flow
- Adding new environment variables
- Modifying app navigation structure
- Creating new Convex indexes
- Changing offline sync strategy

### Agent MUST NOT:
- Store secrets or API keys in code
- Skip auth validation in Convex functions
- Use StyleSheet instead of NativeWind
- Use AsyncStorage instead of MMKV
- Deploy to production without explicit approval
- Modify .env files directly

## Task Execution Guidelines

### Before Starting Any Task:
1. Read `prd.md` for feature requirements
2. Check `CLAUDE.md` for code patterns and constraints
3. Review existing code in relevant directories
4. Identify which phase/milestone the task belongs to

### When Implementing Features:
1. Start with Convex backend (schema, queries, mutations)
2. Build UI components following design system
3. Connect UI to Convex using hooks
4. Add offline support if applicable
5. Test on iOS simulator
6. Run typecheck before considering complete

### When Debugging:
1. Check Convex dashboard for backend errors
2. Review Metro bundler console for frontend errors
3. Verify auth state with Clerk dashboard
4. Test offline behavior separately
5. Check network tab for API issues

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `ListCard.tsx` |
| Hooks | camelCase with `use` prefix | `useHousehold.ts` |
| Utilities | camelCase | `cn.ts` |
| Convex functions | camelCase | `households.ts` |
| Constants | camelCase or SCREAMING_SNAKE | `categories.ts` |

## Validation Checklist

Before marking any task complete:
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Code follows NativeWind patterns (no StyleSheet)
- [ ] Convex functions validate authentication
- [ ] Convex queries use indexes for filtered data
- [ ] Touch targets are minimum 44x44pt
- [ ] Accessibility labels on interactive elements
- [ ] Error states handled gracefully
- [ ] Loading states implemented where applicable

## Common Pitfalls to Avoid

1. **Forgetting auth validation** - Every Convex query/mutation accessing user data must validate identity
2. **Missing indexes** - All filtered Convex queries must use defined indexes
3. **Hardcoded colors** - Use design system colors from Tailwind config
4. **Fixed font sizes** - Use relative sizing for Dynamic Type support
5. **Blocking offline** - Core list operations must work offline
6. **Missing optimistic updates** - UI should update immediately, sync in background

## Testing Scenarios

### Authentication Flow
- New user sign up (Google, Apple)
- Returning user sign in
- Token expiration and refresh
- Sign out and data cleanup

### Household Flow
- Create household as first user
- Generate and share invite code
- Join household as second user
- Prevent third user from joining

### List Operations
- Create list
- Add items (with/without quantity)
- Check off items
- Delete items (swipe)
- Archive completed list
- Real-time sync between two devices

### Offline Scenarios
- Add item while offline
- Check item while offline
- Reconnect and verify sync
- Conflict resolution (both users edit same item)

### Receipt Scanning
- Capture receipt image
- OCR extraction success
- OCR extraction failure (manual entry)
- Session creation with amount

## Emergency Procedures

### If Convex deployment fails:
1. Check `npx convex logs` for errors
2. Verify schema changes are backward compatible
3. Roll back if needed with `npx convex deploy --cmd 'git checkout HEAD~1 convex/'`

### If auth breaks:
1. Clear SecureStore tokens
2. Verify Clerk dashboard configuration
3. Check JWT template named "convex" exists
4. Verify webhook is receiving user events

### If offline sync corrupts data:
1. Clear MMKV cache
2. Force fresh fetch from Convex
3. Review conflict resolution logic
4. Check timestamps on conflicting records

## Contact Points

- **PRD Questions**: Reference `prd.md` first
- **Code Patterns**: Reference `CLAUDE.md` first
- **Convex Issues**: Check [Convex docs](https://docs.convex.dev)
- **Expo Issues**: Check [Expo docs](https://docs.expo.dev)
- **Clerk Issues**: Check [Clerk docs](https://clerk.com/docs)
