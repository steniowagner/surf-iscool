import { faker } from '@faker-js/faker';

import { ActivateAccountUsingOtpRequestDto } from '@src/module/identity/http/rest/dto/request/activate-account-using-otp.request.dto';
import { RegisterUsingEmailRequestDto } from '@src/module/identity/http/rest/dto/request/register-using-email.request.dto';

export const makeActivateAccountUsingOtpRequestDto = (
  overrides: Partial<ActivateAccountUsingOtpRequestDto> = {},
) => ({
  email: faker.internet.email().toLowerCase(),
  code: faker.string.numeric({
    length: parseInt(process.env.OTP_LENGTH as string, 10),
  }),
  ...overrides,
});

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
