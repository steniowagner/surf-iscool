# Web - CLAUDE.md

Next.js 16 frontend with React 19 and Tailwind CSS 4.

## Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19
- **Styling**: Tailwind CSS 4
- **Auth**: `@surf-iscool/auth-client` (Supabase)
- **Types**: `@surf-iscool/types` (shared enums)

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── (routes)/     # Route groups
├── components/       # React components
│   ├── ui/           # Reusable UI components
│   └── features/     # Feature-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
└── services/         # API client and external services
```

## Code Patterns

### Page Component (App Router)
```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  // Server component by default
  return <Dashboard />;
}
```

### Client Component
```typescript
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Authentication with auth-client
```typescript
'use client';

import { createWebAuthClient } from '@surf-iscool/auth-client';

const authClient = createWebAuthClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

async function handleSignIn(email: string, password: string) {
  try {
    const { accessToken } = await authClient.signInWithEmail({ email, password });
    // Store token, redirect, etc.
  } catch (error) {
    // Handle error
  }
}

async function handleSignUp(email: string, password: string) {
  try {
    const { accessToken } = await authClient.signUpWithEmail({ email, password });
    // Store token, redirect, etc.
  } catch (error) {
    // Handle error
  }
}
```

### API Calls
```typescript
async function fetchProfile(token: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}
```

## Styling with Tailwind CSS 4

```typescript
// Use utility classes directly
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
```

Note: `NEXT_PUBLIC_` prefix exposes variables to the browser.

## Import Organization

1. React/Next.js imports
2. Third-party packages
3. `@surf-iscool/*` workspace packages
4. `@/` path aliases (components, hooks, lib)
5. Relative imports

## Naming Conventions

- **Files**: kebab-case for routes, PascalCase for components
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
