# Mobile - CLAUDE.md

Expo 54 mobile app with React Native.

## Commands

```bash
npm run start         # Start Expo dev server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator
npm run lint          # Run ESLint
```

## Tech Stack

- **Framework**: Expo 54 (Managed workflow)
- **React Native**: Latest compatible version
- **Navigation**: Expo Router (file-based routing)
- **Auth**: `@surf-iscool/auth-client` (Supabase)
- **Types**: `@surf-iscool/types` (shared enums)

## Project Structure

```
src/
├── app/              # Expo Router pages
│   ├── _layout.tsx   # Root layout
│   ├── index.tsx     # Home screen
│   └── (tabs)/       # Tab navigation group
├── components/       # React Native components
│   ├── ui/           # Reusable UI components
│   └── features/     # Feature-specific components
├── hooks/            # Custom hooks
├── lib/              # Utilities and helpers
└── services/         # API client and external services
```

## Code Patterns

### Screen Component
```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

### Authentication with auth-client
```typescript
import { createWebAuthClient } from '@surf-iscool/auth-client';

const authClient = createWebAuthClient({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
});

async function handleSignIn(email: string, password: string) {
  try {
    const { accessToken } = await authClient.signInWithEmail({ email, password });
    // Store token securely (expo-secure-store)
  } catch (error) {
    // Handle error
  }
}

async function handleSignUp(email: string, password: string) {
  try {
    const { accessToken } = await authClient.signUpWithEmail({ email, password });
    // Store token securely
  } catch (error) {
    // Handle error
  }
}
```

### Secure Token Storage
```typescript
import * as SecureStore from 'expo-secure-store';

async function saveToken(token: string) {
  await SecureStore.setItemAsync('accessToken', token);
}

async function getToken() {
  return await SecureStore.getItemAsync('accessToken');
}
```

### API Calls
```typescript
async function fetchProfile(token: string) {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}
```

## Expo Router Navigation

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
```

```typescript
// Navigate programmatically
import { router } from 'expo-router';

router.push('/profile');
router.replace('/login');
router.back();
```

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL
```

Note: `EXPO_PUBLIC_` prefix exposes variables to the app.

## Platform-Specific Code

```typescript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
});

// Or use Platform.select
const padding = Platform.select({
  ios: 50,
  android: 30,
  default: 40,
});
```

## Import Organization

1. React/React Native imports
2. Expo packages
3. Third-party packages
4. `@surf-iscool/*` workspace packages
5. Local path aliases
6. Relative imports

## Naming Conventions

- **Files**: kebab-case for routes, PascalCase for components
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Screens**: PascalCase with `Screen` suffix (`HomeScreen.tsx`)
