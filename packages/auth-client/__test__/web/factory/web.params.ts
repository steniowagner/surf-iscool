import { faker } from "@faker-js/faker";

export const makeSignUpWithEmailParams = () => ({
  email: faker.internet.email(),
  password: faker.string.alphanumeric(12),
});

export const makeSignInWithEmailParams = () => ({
  email: faker.internet.email(),
  password: faker.string.alphanumeric(12),
});
