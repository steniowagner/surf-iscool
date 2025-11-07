import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ActivateAccountUsingOtpResponseDto {
  @IsNotEmpty()
  @IsBoolean()
  activated: boolean;
}
