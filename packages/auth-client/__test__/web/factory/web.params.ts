import { faker } from "@faker-js/faker";
import type { OAuthProvider, SignInWithOAuthParams } from "../../../src/types";

export const makeSignUpWithEmailParams = () => ({
  email: faker.internet.email(),
  password: faker.string.alphanumeric(12),
});

export const makeSignInWithEmailParams = () => ({
  email: faker.internet.email(),
  password: faker.string.alphanumeric(12),
});

export const makeSignInWithOAuthParams = (
  overrides?: Partial<SignInWithOAuthParams>
): SignInWithOAuthParams => ({
  provider: faker.helpers.arrayElement<OAuthProvider>([
    "google",
    "facebook",
    "apple",
  ]),
  redirectTo: faker.internet.url(),
  ...overrides,
});
