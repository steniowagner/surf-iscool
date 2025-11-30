import { faker } from "@faker-js/faker";

import type { AuthUser, AuthSession } from "../../../src/types";

export const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: faker.string.alphanumeric(),
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
  idToken: faker.string.alphanumeric(),
  refreshToken: faker.string.alphanumeric(),
  ...overrides,
});
