# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Surf-iscool is a full-stack TypeScript monorepo for a surf school management platform.

## Monorepo Structure

```
surf-iscool/
├── apps/
│   ├── api/          # NestJS 11 backend (see apps/api/CLAUDE.md)
│   ├── web/          # Next.js 16 frontend (see apps/web/CLAUDE.md)
│   └── mobile/       # Expo 54 mobile app (see apps/mobile/CLAUDE.md)
├── packages/
│   ├── types/        # Shared TypeScript enums (UserStatus, UserRole)
│   └── auth-client/  # Platform-agnostic Supabase authentication SDK
└── docs/
    └── IMPLEMENTATION_PLAN.md  # Full project roadmap
```

## Root Commands (Turbo)

```bash
pnpm run dev:api      # Start API in watch mode
pnpm run dev:web      # Start web app
pnpm run dev:mobile   # Start mobile app
pnpm run build        # Build all apps (respects dependency order)
pnpm run lint         # Lint all packages
pnpm run test         # Test all packages
```

## Workspace Dependencies

- Internal packages use `workspace:*` protocol
- Build order managed by Turbo's `dependsOn: ["^build"]`
- Shared types imported as `@surf-iscool/types`
- Auth client imported as `@surf-iscool/auth-client`

## Shared Enums (packages/types)

```typescript
enum UserStatus {
  PendingProfileInformation = 'pending_profile_information',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  Denied = 'denied',
}

enum UserRole {
  Admin = 'admin',
  Instructor = 'instructor',
  Student = 'student',
}
```

## Auth Client (packages/auth-client)

Platform-agnostic Supabase authentication SDK used by both web and mobile:

```bash
npm run test          # Run tests (Vitest)
npm run build         # Build (runs tests first)
```

Features:
- `signUpWithEmail(email, password)` - Create new account
- `signInWithEmail(email, password)` - Sign in with credentials
- Returns `{ user, accessToken, refreshToken }` on success
- Throws error on failure

Usage:
```typescript
import { createWebAuthClient } from '@surf-iscool/auth-client';

const authClient = createWebAuthClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
});

const session = await authClient.signInWithEmail({ email, password });
```
