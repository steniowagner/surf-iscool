import { faker } from '@faker-js/faker';

import { RegisterUsingEmailRequestDto } from '@src/module/identity/http/rest/dto/request/register-using-email.request.dto';
import {
  UserModel,
  UserStatus,
} from '@src/module/identity/core/model/user.model';

export const makeRegisterUserUsingEmailAndPasswordDto = (
  overrides: Partial<RegisterUsingEmailRequestDto> = {},
) => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: '5585987654321',
  email: faker.internet.email().toLowerCase(),
  password: faker.internet.password({ length: 14, memorable: false }) + '1!',
  ...overrides,
});

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
