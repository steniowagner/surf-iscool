# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Surf-iscool is a full-stack TypeScript monorepo for a surf school management platform with three apps and two shared packages.

## Commands

### Root Level (Turbo)
```bash
pnpm run dev:api      # Start API (NestJS) in watch mode
pnpm run dev:web      # Start web app (Next.js)
pnpm run dev:mobile   # Start mobile app (Expo)
pnpm run build        # Build all apps (respects dependency order)
pnpm run lint         # Lint all packages
pnpm run test         # Test all packages
```

### API (apps/api)
```bash
npm run test                    # Run unit tests (Jest)
npm run test:watch              # Run tests in watch mode
npm run test:e2e                # Run E2E tests with testcontainers
npm run db:generate:dev         # Generate Drizzle migrations
npm run db:migrate:dev          # Apply Drizzle migrations
npm run format                  # Format with Prettier
```

### Auth Client (packages/auth-client)
```bash
npm run test          # Run tests (Vitest)
npm run build         # Build (runs tests first)
```

## Architecture

### Monorepo Structure
- **apps/api**: NestJS 11 backend with PostgreSQL (Drizzle ORM) and Firebase Auth
- **apps/web**: Next.js 16 with React 19 and Tailwind CSS 4
- **apps/mobile**: Expo 54 with React Native
- **packages/types**: Shared TypeScript enums (UserStatus, UserRole)
- **packages/auth-client**: Platform-agnostic Firebase authentication SDK

### API Path Aliases
```
@src/*           → ./src/*
@shared-libs/*   → ./src/module/shared/lib/*
@shared-modules/* → ./src/module/shared/module/*
@shared-core/*   → ./src/module/shared/core/*
```

### API Module Organization
Feature modules follow this structure:
```
module/<feature>/
├── core/model/         # Domain models extending DefaultModel
├── persistence/        # Drizzle schema and repository extending DefaultRepository
├── http/               # Controllers and DTOs
├── service/            # Business logic
└── <feature>.module.ts
```

Shared modules live in `module/shared/module/`:
- **config**: Zod-validated environment configuration
- **auth**: Firebase authentication with Passport strategy
- **persistence**: Drizzle database connection and DefaultRepository
- **logger**: Winston logging via nest-winston

### Domain Model Pattern
Models extend `DefaultModel` and use static factory methods:
```typescript
export class UserModel extends DefaultModel {
  static create(data: WithOptional<UserModel, ...>) { ... }
  static createFrom(data: UserModel) { ... }
}
```

### Repository Pattern
Repositories extend `DefaultRepository<Model, DrizzleTable>` which provides:
- `create()` and `findById()` with automatic model mapping
- Error handling for PostgreSQL constraint violations (23505, 23503, 23502)
- Transaction support via optional `db` parameter

### E2E Testing
E2E tests use testcontainers for PostgreSQL:
- Tests live in `apps/api/__test__/e2e/`
- `TestDb` class manages container lifecycle and migrations
- Factory functions generate test data with Faker

## Environment Variables (API)
```
PORT
DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
NODE_ENV (dev, test, prod)
```

## Workspace Dependencies
Internal packages use `workspace:*` protocol. Build order is managed by Turbo's `dependsOn: ["^build"]` configuration.
