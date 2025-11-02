import { faker } from '@faker-js/faker';

import { RegisterUsingEmailRequestDto } from '@src/module/identity/http/rest/dto/request/register-using-email.request.dto';

export const registerUserUsingEmailAndPasswordDto = (
  overrides: Partial<RegisterUsingEmailRequestDto> = {},
) => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: '5585987654321',
  email: faker.internet.email().toLowerCase(),
  password: faker.internet.password({ length: 14, memorable: false }) + '1!',
  ...overrides,
});
