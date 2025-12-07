import { faker } from "@faker-js/faker";

export const makeSignUpWithEmailParams = () => ({
  email: faker.internet.email(),
  password: faker.string.alphanumeric(),
  onConfirmEmailRedirectUrl: faker.internet.url(),
});

export const makeSignInWithEmailParams = () => ({
  email: faker.internet.email(),
  password: faker.string.alphanumeric(),
});
