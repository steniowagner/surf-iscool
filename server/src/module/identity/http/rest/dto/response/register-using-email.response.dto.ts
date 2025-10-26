import { Expose, Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';

class EmailVerification {
  @IsNotEmpty()
  @IsBoolean()
  @Expose()
  sent: boolean;

  @IsNotEmpty()
  @IsISO8601()
  @Expose()
  expiresAt: Date;
}

export class RegisterUsingEmailResponseDto {
  @IsNotEmpty()
  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => EmailVerification)
  emailVerification: EmailVerification;
}
