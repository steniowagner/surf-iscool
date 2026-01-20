import { IsNotEmpty, IsString, MaxLength, IsUrl } from 'class-validator';

export class CompleteProfileRequestDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsNotEmpty()
  @IsUrl()
  @MaxLength(500)
  avatarUrl!: string;
}
