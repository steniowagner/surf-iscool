import { faker } from '@faker-js/faker';

export const makeSupabaseUser = (
  overrides: { id?: string; email?: string } = {},
) => ({
  id: overrides.id ?? faker.string.uuid(),
  email: overrides.email ?? faker.internet.email(),
  email_confirmed_at: new Date().toISOString(),
  user_metadata: {},
});
