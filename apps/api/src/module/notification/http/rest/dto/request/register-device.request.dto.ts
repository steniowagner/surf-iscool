import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceRequestDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  deviceToken!: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['ios', 'android'])
  platform!: string;
}
