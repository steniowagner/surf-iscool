import { faker } from "@faker-js/faker";

import type { AuthUser, AuthSession } from "../../../src/types";

export const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  profilePicture: faker.image.avatar(),
  isEmailVerified: faker.number.int() % 2 === 0,
  ...overrides,
});

export const makeSession = (
  overrides: Partial<AuthSession> = {}
): AuthSession => ({
  user: makeUser(overrides.user),
  accessToken: faker.string.alphanumeric(32),
  refreshToken: faker.string.alphanumeric(32),
  ...overrides,
});

export const makeSupabaseUser = (
  overrides: { id?: string; email?: string } = {}
) => ({
  id: overrides.id ?? faker.string.uuid(),
  email: overrides.email ?? faker.internet.email(),
  email_confirmed_at: new Date().toISOString(),
  user_metadata: {
    full_name: faker.person.fullName(),
    avatar_url: faker.image.avatar(),
  },
});

export const makeSupabaseSession = (
  overrides: { access_token?: string; refresh_token?: string } = {}
) => ({
  access_token: overrides.access_token ?? faker.string.alphanumeric(32),
  refresh_token: overrides.refresh_token ?? faker.string.alphanumeric(32),
});
