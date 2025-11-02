import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';

export class RegisterUsingEmailRequestDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsNotEmpty()
  @IsPhoneNumber('BR', {
    message: 'phone must be a valid E.164 number (e.g. 5585987654321)',
  })
  phone: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(parseInt(process.env.PASSWORD_MIN_LENGTH as string))
  password: string;
}
