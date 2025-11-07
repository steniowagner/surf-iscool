import { faker } from '@faker-js/faker';
import {
  EmailVerificationModel,
  EmailVerificationPurpose,
  EmailVerificationTokenType,
} from '@src/module/identity/core/model/email-verification.model';

import {
  UserModel,
  UserStatus,
} from '@src/module/identity/core/model/user.model';

export const makeUser = (overrides: Partial<UserModel> = {}) =>
  UserModel.create({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: '5585987654321',
    email: faker.internet.email().toLowerCase(),
    avatarUrl: faker.internet.url(),
    status: UserStatus.PendingEmailActivation,
    ...overrides,
  });

export const makeEmailVerification = (
  overrides: Partial<EmailVerificationModel> = {},
) => {
  const emailVerification = EmailVerificationModel.create({
    userId: faker.string.uuid(),
    tokenHash: faker.string.alphanumeric({
      length: 100,
    }),
    tokenType: EmailVerificationTokenType.Otp,
    purpose: EmailVerificationPurpose.AccountActivation,
    ...overrides,
  });

  delete emailVerification.deletedAt;

  return emailVerification;
};
