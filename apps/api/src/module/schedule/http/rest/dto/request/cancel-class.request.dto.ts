import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelClassRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cancellationReason?: string;
}
