import { faker } from '@faker-js/faker';

import { UserStatus } from '@src/module/identity/core/enum/user.enum';
import { UserModel } from '@src/module/identity/core/model/user.model';
import { generateId } from '@shared-libs/genereate-id';

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
