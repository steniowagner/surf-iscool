import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class BroadcastNotificationRequestDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  body!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
