# React Native Web Migration Plan

## Overview
Migrate the QBK Manager frontend from React + MUI to React Native with Expo, enabling deployment to iOS, Android, and Web from a single codebase.

## Tech Stack (New)
- **Framework**: Expo SDK 52+ with Expo Router
- **UI Library**: Tamagui
- **Navigation**: Expo Router (file-based routing)
- **Auth**: Clerk Expo SDK
- **HTTP Client**: Axios (unchanged)
- **Date Handling**: dayjs (unchanged)

## Project Structure (After Migration)

```
qbk-manager/
├── backend/                    # Unchanged
├── frontend/                   # Keep for reference during migration, delete after
└── app/                        # New Expo app
    ├── app/                    # Expo Router pages (file-based routing)
    │   ├── _layout.tsx         # Root layout with providers
    │   ├── index.tsx           # Redirect to /events or /sign-in
    │   ├── sign-in.tsx
    │   ├── sign-up.tsx
    │   └── (tabs)/             # Tab navigator for authenticated routes
    │       ├── _layout.tsx     # Tab bar configuration
    │       ├── events/
    │       │   ├── index.tsx   # Events list
    │       │   └── [id].tsx    # Event detail/form
    │       ├── players/
    │       │   └── index.tsx   # Players list (admin/staff only)
    │       └── profile.tsx     # My Profile
    ├── components/
    │   ├── events/
    │   │   ├── EventCard.tsx
    │   │   ├── EventList.tsx
    │   │   ├── EventForm.tsx
    │   │   ├── EventCalendar.tsx
    │   │   └── EnrollmentSection.tsx
    │   └── players/
    │       └── PlayerForm.tsx
    ├── shared/                 # Extracted from old frontend
    │   ├── types/index.ts      # 100% reusable
    │   ├── api/services.ts     # 100% reusable
    │   ├── hooks/
    │   │   ├── useEvents.ts    # 100% reusable
    │   │   └── usePlayers.ts   # 100% reusable
    │   └── utils/eventUtils.ts # 100% reusable
    ├── contexts/
    │   └── AuthContext.tsx     # Adapted for Clerk Expo
    ├── tamagui.config.ts
    ├── app.json
    ├── package.json
    └── tsconfig.json
```

## What Gets Shared (Copy from frontend/)

| Source | Destination | Changes Needed |
|--------|-------------|----------------|
| `frontend/src/types/index.ts` | `app/shared/types/index.ts` | None |
| `frontend/src/services/api.ts` | `app/shared/api/services.ts` | Minor (remove unused imports) |
| `frontend/src/hooks/useEvents.ts` | `app/shared/hooks/useEvents.ts` | None |
| `frontend/src/hooks/usePlayers.ts` | `app/shared/hooks/usePlayers.ts` | None |
| `frontend/src/utils/eventUtils.ts` | `app/shared/utils/eventUtils.ts` | None |

## Component Migration Map

| Old (MUI) | New (Tamagui) | Complexity |
|-----------|---------------|------------|
| `Box` | `View`, `XStack`, `YStack` | Low |
| `Typography` | `Text`, `H1`-`H6`, `Paragraph` | Low |
| `Button` | `Button` | Low |
| `TextField` | `Input` | Low |
| `Select` | `Select` | Medium |
| `Switch` | `Switch` | Low |
| `Dialog` | `Sheet` or `Dialog` | Medium |
| `Card` | `Card` | Low |
| `Chip` | `Badge` or custom | Medium |
| `Table` | `FlatList` with rows | Medium |
| `CircularProgress` | `Spinner` | Low |
| `Alert` | Custom or Toast | Medium |
| `DateTimePicker` | `react-native-date-picker` | High |
| `react-big-calendar` | `react-native-calendars` | High |

## Implementation Phases

### Phase 1: Project Setup
1. Create Expo app with TypeScript template
2. Install and configure Tamagui
3. Install Clerk Expo SDK
4. Set up Expo Router
5. Configure environment variables

**Commands:**
```bash
npx create-expo-app@latest app --template tabs
cd app
npx tamagui@latest init
npm install @clerk/clerk-expo expo-secure-store axios dayjs
```

### Phase 2: Shared Code Setup
1. Create `shared/` directory
2. Copy types, API services, hooks, utils from frontend
3. Verify imports work

### Phase 3: Auth Setup
1. Configure Clerk Expo provider
2. Create sign-in/sign-up screens
3. Adapt AuthContext for Expo
4. Set up protected routes

### Phase 4: Core Layout
1. Create root layout with providers
2. Create tab navigator with role-based visibility
3. Implement navigation drawer (if needed)

### Phase 5: Events Feature
1. EventList screen with FlatList
2. EventCard component
3. EventForm as modal/sheet
4. Event filters UI
5. Self-enrollment for players

### Phase 6: Players Feature
1. Players list screen (admin/staff only)
2. PlayerForm modal
3. Search functionality

### Phase 7: Profile Feature
1. My Profile screen
2. Display user info based on role

### Phase 8: Web Testing & Polish
1. Test all features on web (primary development target)
2. Fix any web-specific issues
3. Verify responsive design

### Phase 9: Calendar Feature (Deferred)
*Defer until after core features are stable*
1. Install react-native-calendars
2. Create EventCalendar component
3. Event detail on date selection

### Phase 10: Native Testing (Deferred)
*Defer until after additional features are implemented and tested on web*
1. Test on iOS simulator
2. Test on Android emulator
3. Fix platform-specific issues

## Key Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "@clerk/clerk-expo": "^2.0.0",
    "@tamagui/core": "^1.x",
    "@tamagui/config": "^1.x",
    "tamagui": "^1.x",
    "axios": "^1.7.7",
    "dayjs": "^1.11.13",
    "react-native-calendars": "^1.x",
    "react-native-date-picker": "^5.x"
  }
}
```

## Files to Create (Phase 1-4)

1. `app/app.json` - Expo config
2. `app/package.json` - Dependencies
3. `app/tsconfig.json` - TypeScript config
4. `app/tamagui.config.ts` - Tamagui theme
5. `app/app/_layout.tsx` - Root layout
6. `app/app/index.tsx` - Entry redirect
7. `app/app/sign-in.tsx` - Sign in screen
8. `app/app/sign-up.tsx` - Sign up screen
9. `app/app/(tabs)/_layout.tsx` - Tab navigator
10. `app/shared/types/index.ts` - Types (copy)
11. `app/shared/api/services.ts` - API (copy)
12. `app/shared/hooks/useEvents.ts` - Hook (copy)
13. `app/shared/hooks/usePlayers.ts` - Hook (copy)
14. `app/shared/utils/eventUtils.ts` - Utils (copy)
15. `app/contexts/AuthContext.tsx` - Auth context

## Development Workflow

**Web-first development:**
- Run `npx expo start --web` throughout all phases
- Test in browser (Chrome/Firefox) during development
- iOS/Android simulator testing deferred until after core features complete
- This allows faster iteration and familiar browser dev tools

## Notes

- **Existing frontend remains fully functional** during migration - use for demos until new app is ready
- Keep `frontend/` directory during migration for reference
- Test each phase on web before moving to next
- Calendar feature deferred to Phase 9
- Clerk Expo SDK may have limitations compared to web SDK
