import { faker } from '@faker-js/faker';

export const makeDecodedToken = (
  overrides: { uid?: string; email?: string } = {},
) => ({
  uid: faker.string.uuid(),
  email: faker.internet.email(),
  ...overrides,
});
