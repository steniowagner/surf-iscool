import { faker } from '@faker-js/faker';

import { UserStatus } from '@surf-iscool/types';
import { generateId } from '@shared-libs/genereate-id';
import { UserModel } from '@src/module/identity/core/model/user.model';

export const makeUser = (overrides: Partial<UserModel> = {}) =>
  UserModel.create({
    id: generateId(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: '5585987654321',
    email: faker.internet.email().toLowerCase(),
    avatarUrl: faker.internet.url(),
    status: UserStatus.PendingProfileInformation,
    ...overrides,
  });
