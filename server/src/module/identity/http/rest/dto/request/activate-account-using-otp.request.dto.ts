import { IsEmail, IsNotEmpty, IsNumberString, Length } from 'class-validator';

import { loadEnv } from '@shared-libs/load-env';

loadEnv(); // needs process.env.OTP_LENGTH

export class ActivateAccountUsingOtpRequestDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsNumberString()
  @Length(parseInt(process.env.OTP_LENGTH as string, 10))
  code: string;
}
