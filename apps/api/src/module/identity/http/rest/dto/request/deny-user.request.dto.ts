import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DenyUserRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
