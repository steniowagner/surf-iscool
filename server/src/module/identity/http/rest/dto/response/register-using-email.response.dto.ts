import { Expose } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsBoolean } from 'class-validator';

export class RegisterUsingEmailResponseDto {
  @IsNotEmpty()
  @Expose()
  @IsBoolean()
  activationEmailSent: boolean;

  @IsNotEmpty()
  @IsISO8601()
  @Expose()
  expiresAt: Date;
}
