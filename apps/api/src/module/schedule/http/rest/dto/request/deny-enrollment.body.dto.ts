import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DenyEnrollmentBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
