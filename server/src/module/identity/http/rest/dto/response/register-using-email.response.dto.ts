import { Expose } from 'class-transformer';
import { IsISO8601, IsNotEmpty } from 'class-validator';

export class RegisterUsingEmailResponseDto {
  @IsNotEmpty()
  @IsISO8601()
  @Expose()
  activationEmailExpiresAt: Date;
}
